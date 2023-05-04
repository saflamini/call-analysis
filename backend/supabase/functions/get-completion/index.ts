// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai'

//function last deployed May 4, 2023
const supabaseURL = '' //YOUR URL
const supabaseKey = ' ' //YOUR KEY

const supabase = createClient(supabaseURL, supabaseKey)
console.log("Hello from Functions!")

type Embeddings = number[][];
type Embedding = number[]
interface KNNResult {
  id: number;
  chapter_content: string;
  similarity: number;
}

interface KNNResults {
  docsContext1?: string;
  docsContext2?: string;
  docsContext3?: string;
}

let configuration: Configuration, openai: OpenAIApi;

async function embedUserQuestion(userQuestion: string) {
  const embeddingResponse = await openai.createEmbedding({
      model: 'text-embedding-ada-002',
      input: userQuestion
  });
  return embeddingResponse.data.data[0].embedding;
}

async function getDocsKNNForFile(embeddedUserQuestion: number[], userId: string, fileName: string) {
  try {
    let { data, error } = await supabase
    .rpc('get_file_embeddings_matches', {
      match_count: 1, 
      p_user_id: userId,
      p_file_name: fileName,
      query_embedding: embeddedUserQuestion, 
      similarity_threshold: 0.78,
  });
  let results: KNNResults = {
    docsContext1: data[0].chapter_content,
    // docsContext2: data[1].chapter_content,
    // docsContext3: data[2].chapter_content
  };
  return results;
  } catch (error) {
    console.error('Error fetching KNN results:', error);
    return undefined;
  }
}

async function getDocsKNN(embeddedUserQuestion: number[], userId: string) {
  try {
    let { data, error } = await supabase
    .rpc('get_embeddings_matches', {
      match_count: 2, 
      p_user_id: userId,
      query_embedding: embeddedUserQuestion, 
      similarity_threshold: 0.78,
  });
  let results: KNNResults = {
    docsContext1: data[0].chapter_content,
    docsContext2: data[1].chapter_content,
    // docsContext3: data[2].chapter_content
  };
  return results;
  } catch (error) {
    console.error('Error fetching KNN results:', error);
    return undefined;
  }
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
      const jsonData = await req.json();
      const userId = jsonData.userId;
      const message = jsonData.message;
      const fileSelection = jsonData.fileSelection;
      const openAIKey = jsonData.openAIKey;

      configuration = new Configuration({
        apiKey: openAIKey
      });
      openai = new OpenAIApi(configuration)

      const embeddedUserInput = await embedUserQuestion(`${message}`);  

      let result;
      if (fileSelection === "Search All Recordings") {
        result = await getDocsKNN(embeddedUserInput, userId);
      } else {
        result = await getDocsKNNForFile(embeddedUserInput, userId, fileSelection);
      }

      let docsContextOne, docsContextTwo, docsContextThree;
      
      if (result !== undefined) {
        const { docsContext1, docsContext2, docsContext3 } = result;
        docsContextOne = docsContext1;
        docsContextTwo = docsContext2;
        docsContextThree = docsContext3;
      } else if (result === undefined) {
        docsContextOne = '';
        docsContextTwo = '';
        docsContextThree = '';
      }
      try {
        //only have space reliably for a single chapter. Need GPT-4 32k :/
        const response = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: [
              {"role": "system", "content": `You are a helpful assistant who answers questions about sales calls that happened between Assembly AI sales and customer service reps and their customers. You're about to receive a question about how these calls went, with specific context which includes a transcribed portion of one of the calls, and your job is to provide the most professional, concise, and insightful answer possible.`},
              {"role": "system", "content": `Context #1: ${docsContextOne}`},
              // {"role": "system", "content": `Context #2: ${docsContextTwo}`},
              // {"role": "system", "content": `Context #3: ${docsContextThree}`},
              {"role": "user", "content": `Please answer the following query: ${message}`}
          ],
          max_tokens: 2500,
          temperature: 0.3
      });

      let messageResponse: string | undefined;
      if (response.data.choices[0].message?.content) {
        messageResponse = response.data.choices[0].message?.content;
      }

      const testResult = {
        inputQuestion: message,
        message: messageResponse,
        userId: userId,
        docsContext: docsContextOne,
        embeddedUserInput: embeddedUserInput
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