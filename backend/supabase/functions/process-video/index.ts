// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai'
import axios from 'https://esm.sh/axios';

//function last deployed May 4, 2023
const supabaseURL = '' //YOUR URL
const supabaseKey = ' ' //YOUR KEY

const supabase = createClient(supabaseURL, supabaseKey)

console.log("Hello from Functions!")

//SET UP ASSEMBLY AI
let assembly: any; // oh god any type

let configuration: Configuration, openai: OpenAIApi;

type Chapter = {
  start: number;
  end: number;
  summary: string;
  headline: string;
  gist: string;
  content: string;
};

//add in missing types/any types later
async function checkTranscriptionStatus(transcriptId: string): Promise<any> {
  console.log('checking status of id: ', transcriptId, '...')
  const response = await assembly.get(`/transcript/${transcriptId}`);
  const status = response.data.status;

  if (status === 'completed') {
    return response.data;
  } else if (status === 'error') {
    throw new Error('Transcription failed');
  } else {
    // Wait for some time and then check again
    await new Promise(resolve => setTimeout(resolve, 5000));
    return checkTranscriptionStatus(transcriptId);
  }
}

  //add in types later
  async function transcribeAudio(inputUrl: string): Promise<any> {
    console.log('Transcribing audio...');

    let assemblyFileId;
    console.log('this is the file we are passing to /transcript: ', inputUrl);
    try {
      const response = await assembly.post('/transcript', {
        audio_url: inputUrl, 
        auto_chapters: true, 
        speaker_labels: true
      });
      assemblyFileId = response.data.id;
      console.log('assembly file id: ', assemblyFileId);
    } catch (error) {
      console.error('Error uploading file to Assembly:', error);
      throw error;
    }
  
    try {
      const transcriptData = await checkTranscriptionStatus(assemblyFileId);
      console.log('Transcription complete');
      return transcriptData;
    } catch (error) {
      console.error('Error checking transcription status:', error);
      throw error;
    }
  }

  async function getAudioVtt(transcriptId: string) {
    try {
      const response = await assembly.get(`/transcript/${transcriptId}/vtt`);
      const vtt = response.data;
      return vtt;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  function vttToString(vttString: string): string {
    // Split the VTT string by lines
    const lines = vttString.split(/\r?\n/);
  
    // Check that there are at least three lines (VTT metadata, blank line, and transcription text)
    if (lines.length < 3) {
      throw new Error('Invalid VTT format');
    }
  
    // Check that the third line is blank
    if (lines[2] !== '') {
      throw new Error('Invalid VTT format');
    }
  
    // Remove the first two lines which contain VTT-specific metadata
    lines.splice(0, 3);
  
    // Join the remaining lines with a space to create a single string
    const plainText = lines.join(' ');
  
    return plainText;
  }
  
  
  function convertTimestampToSeconds(timestamp: string) {            
    const [mmss, ms] = timestamp.split(".");            
    const [mm, ss] = mmss.split(":").map(parseFloat);
    const milliseconds = parseFloat(ms) || 0;
    return (mm * 60) + ss + (milliseconds / 1000);
  }
  
  function splitChapterFromVtt(chapter: Chapter, vttContent: string) {
    let output = "";
  
    const [webvttLine, ...restOfContent] = vttContent.split("\n");
    const adjustedVtt = restOfContent.join("\n"); // "\n00:00.000 --> 00:05.000\nHello World!"
  
    const startSeconds = chapter.start / 1000;
    const endSeconds = chapter.end / 1000;
    adjustedVtt.split("\n\n").forEach((block) => {
      const [timecode, ...lines] = block.split("\n");
      const [startTime, endTime] = timecode.split(" --> ");
      let start;
      let end;
      if (startTime.length > 0 && endTime.length > 0) {
        start = convertTimestampToSeconds(startTime);
        end = convertTimestampToSeconds(endTime);
        if (start <= endSeconds && end >= startSeconds) {
            output += `${timecode}\n`;
            lines.forEach((line) => {
            output += `${line}\n`;
            });
          }
        }
      });
      return output;
    }

    function splitChaptersFromVtt(chapters: Chapter[], vtt: string) {
      for (let i = 0; i < chapters.length; i++) {
        chapters[i].content = splitChapterFromVtt(chapters[i], vtt);
      }
      return chapters;
    }

    function removeLongChapters(chapters: Chapter[]) {
      let newChapters = chapters.filter(chapter => chapter.end - chapter.start <= 360000);
      return newChapters;
    }

    function vttChaptersToText(chapters: Chapter[]): Chapter[] {
      const newChapters = chapters.map((chapter) => {
        // Split the VTT string by lines
        const lines = chapter.content.split(/\r?\n/);
    
        // Filter out the lines containing VTT timestamps
        const filteredLines = lines.filter((line) => !line.match(/^\d{2}:\d{2}\.\d{3}\s-->\s\d{2}:\d{2}\.\d{3}/));
    
        // Join the remaining lines with a space to create a single string
        const plainText = filteredLines.join(' ');
    
        // Return a new chapter with the plain text content
        return {
          ...chapter,
          content: plainText
        };
      });
    
      return newChapters;
    }

serve(async (req) => {
  console.log(req.method)
  if (req.method === 'OPTIONS') {
      return new Response(
          'ok',
          {
              headers: {
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "POST",
                  "Access-Control-Expose-Headers": "Content-Length, X-JSON",
                  "Access-Control-Allow-Headers": "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
              }
          }
      );
  }
  else {
    try {
      const jsonData = await req.json();
      const userId = jsonData.userId;
      const filePath = jsonData.filePath;
      const fileName = jsonData.fileName;
      const openAIKey = jsonData.openAIKey;
      const assemblyAIKey = jsonData.assemblyAIKey;
      const jsonDataResp = {
        id: userId, 
        fileName: fileName,
        file: filePath
      };

      configuration = new Configuration({
        apiKey: openAIKey
      });
      openai = new OpenAIApi(configuration)

      assembly = axios.create({
        baseURL: "https://api.assemblyai.com/v2",
        headers: {
            authorization: assemblyAIKey,
        },
      });

      const userFileData = await supabase.storage.from('call-files').list(`${userId}`, {
        limit: 100,
        offset: 0,
      });
      const { data, error } = await supabase
      .storage
      .from('call-files')
      .createSignedUrl(filePath, 3600);
      //use AssemblyAI to generate transcript
      let assemblyResponse;
      let vttResult;
      let newSplitChapters;
      let adjustedSplitChapters;
      let officialAdjustedSplitChapters;
      if (data) {
        assemblyResponse = await transcribeAudio(data.signedUrl);
        vttResult = await getAudioVtt(assemblyResponse.id);
        newSplitChapters = await splitChaptersFromVtt(assemblyResponse.chapters, vttResult);
        adjustedSplitChapters = await removeLongChapters(newSplitChapters);
        officialAdjustedSplitChapters = vttChaptersToText(adjustedSplitChapters);

        for (let i = 0; i < officialAdjustedSplitChapters.length; i++) {
          let initialEmbeddingResponse = await openai.createEmbedding({
            model: 'text-embedding-ada-002',
            input: officialAdjustedSplitChapters[i].content
          });
          let embeddingResponse = initialEmbeddingResponse.data.data[0].embedding
          let supabaseInsertionResult = await supabase
          .from('callembeddings')
          .insert([
            { 
              user_id: userId,
              file_name: fileName,
              file_path: filePath,
              file_assemblyid: assemblyResponse.id,
              chapter_gist: officialAdjustedSplitChapters[i].gist,
              chapter_content: officialAdjustedSplitChapters[i].content,
              chapter_embedding:  embeddingResponse
            },
          ]);
        }
      }

      const testResult = {
        assemblyResponseResult: assemblyResponse,
        adjustedSplitChapters: officialAdjustedSplitChapters,
      }
      
      return new Response(
          JSON.stringify(testResult),
          {
              headers: {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "POST",
                  "Access-Control-Expose-Headers": "Content-Length, X-JSON",
                  "Access-Control-Allow-Headers": "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
              }
          }
      );
    } catch (error) {
      return new Response(
        JSON.stringify(error),
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST",
                "Access-Control-Expose-Headers": "Content-Length, X-JSON",
                "Access-Control-Allow-Headers": "apikey,X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
            }
        }
    );
    }
  }
})