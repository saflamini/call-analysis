import { createClient } from '@supabase/supabase-js'
import axios from 'axios';
import './UploadVideos.css';
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';


const UploadVideos = ({assemblyAIKey, openAIKey, onFileUploadFinish, supabaseClient, loggedInUser}) => {

    const [supabase, setSupabase] = useState(supabaseClient)
    const [session, setSession] = useState(loggedInUser)
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSuccessCard, setShowSuccessCard] = useState(false);

    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
        setFileName(event.target.files[0]?.name || '');
    }      

    const handleSubmitFile = async (event) => {
        try {
          event.preventDefault();
          if (!file) return;
          setLoading(true); // Start loading

        console.log(file.name)        
        const { fileUploadData, fileUploadError } = await supabase.storage.from('call-files').upload(`${session.user.id}/${file.name}`, file)
        if (fileUploadError) {
            console.log(fileUploadError)
        } else {
            console.log(fileUploadData)
        }
        
        const { data } = await supabase.functions.invoke("process-video", {
            body: {
                filePath: `${session.user.id}/${file.name}`,
                fileName: file.name,
                userId: session.user.id,
                openAIKey: openAIKey,
                assemblyAIKey: assemblyAIKey,
            },
        });
  
        console.log(data);
        setLoading(false)
        onFileUploadFinish();
        setShowSuccessCard(true); // Show the success card
        setTimeout(() => {
            setShowSuccessCard(false); // Hide the success card after 5 seconds
        }, 5000);
    
      } catch (error) {
          console.log("error occured");
          setLoading(false)
        
          console.log(error);
      }
    }

    return (
        <div className='upload-wrapper'>
        {showSuccessCard && (
            <div className="success-card">
            File Uploaded & Processed 🫡 Check The Dropdown Menu 👀
            </div>
        )}
        <div className="upload-container" onClick={() => document.getElementById('contained-button-file').click()}>
            <div className="upload-text">Click to Add File</div>
            <div className="file-name">{fileName}</div>
            <label htmlFor="contained-button-file">
            <input id="contained-button-file" accept="mp4" id="contained-button-file" type="file" className="file-input" onChange={handleFileChange}/>
            </label>
        </div>
        <Button 
        variant="contained" 
        component="span" 
        disabled={loading}
        onClick={handleSubmitFile} 
        // className="upload-button"   
        sx={{
            background: '#3f51b5',
            marginTop: '0.5rem',
            marginBottom: '1rem',
        }}
        >{loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Upload'
          )}
        </Button>
        </div>
    )
}


export default UploadVideos;