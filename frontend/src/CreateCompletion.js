import { createClient } from '@supabase/supabase-js'
import axios from 'axios';
import './CreateCompletion.css';
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import Button from '@mui/material/Button';
import { MenuItem, Select } from '@mui/material';
import { Checkbox, FormControlLabel } from "@mui/material";
import CircularProgress from '@mui/material/CircularProgress';

const CreateCompletion = ({manRefreshKey, onSaveAssemblyAIKey, onSaveOpenAIKey, supabaseClient, loggedInUser}) => {

    const [supabase, setSupabase] = useState(supabaseClient)
    const [session, setSession] = useState(loggedInUser)
    const [isGenerating, setIsGenerating] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [apiOutput, setAPIOutput] = useState('');
    const [file, setFile] = useState(null);
    const [fileNames, setFileNames] = useState([]);
    const [selectedFile, setSelectedFile] = useState('Search All Recordings');
    // State variables for AssemblyAI API Key
    const [assemblyAIKey, setAssemblyAIKey] = useState("");
    const [assemblyAIKeySaved, setAssemblyAIKeySaved] = useState(false);
    // State variables for OpenAI API Key
    const [openAIKey, setOpenAIKey] = useState("");
    const [openAIKeySaved, setOpenAIKeySaved] = useState(false);
    const [showAssemblyAIKey, setShowAssemblyAIKey] = useState(false);
    const [showOpenAIKey, setShowOpenAIKey] = useState(false);     
    const [loading, setLoading] = useState(false);
    const [showSuccessCard, setShowSuccessCard] = useState(false);
 


    const fetchFileNames = async () => {
        try {
        let userFileNames;
        let { data: callembeddings, error } = await supabase.from('callembeddings').select("file_name").eq('user_id', session.user.id)
        if (error) {
            console.log(error)
        } else {
            console.log(callembeddings)
            userFileNames = callembeddings
            setFileNames(userFileNames)
        }
        } catch (error) {
          console.error('Error fetching file names:', error);
        }
      };

      useEffect(() => {
        fetchFileNames();
      }, [manRefreshKey]);


    // Function to handle AssemblyAI API Key change button
    const handleAssemblyAIChange = () => {
        // Store AssemblyAI API Key in browser storage
        localStorage.setItem("assemblyAIKey", assemblyAIKey);
    };

    // Function to handle OpenAI API Key change button
    const handleOpenAIChange = () => {
        // Store OpenAI API Key in browser storage
        localStorage.setItem("openAIKey", openAIKey);
    };

    const saveAssemblyAIKey = () => {
        localStorage.setItem('assemblyAIKey', assemblyAIKey);
        setAssemblyAIKeySaved(true);
        onSaveAssemblyAIKey(assemblyAIKey);
      };
      
      const saveOpenAIKey = () => {
        localStorage.setItem('openAIKey', openAIKey);
        setOpenAIKeySaved(true);
        onSaveOpenAIKey(openAIKey);
      };

      const changeOpenAIKey = () => {
        setOpenAIKeySaved(false);
        setShowOpenAIKey(true);
      };

      const changeAssemblyAIKey = () => {
        setAssemblyAIKeySaved(false);
        setShowAssemblyAIKey(true);
      };
    
      const saveAPIKeys = () => {
        if (setAssemblyAIKey) {
          localStorage.setItem('assemblyAIKey', setAssemblyAIKey);
        }
        if (openAIKey) {
          localStorage.setItem('openAIKey', openAIKey);
        }
      };

      useEffect(() => {
        const savedAssemblyAIKey = localStorage.getItem('assemblyAIKey');
        const savedOpenAIKey = localStorage.getItem('openAIKey');
        if (savedAssemblyAIKey) {
          setAssemblyAIKey(savedAssemblyAIKey);
          setAssemblyAIKeySaved(true);
        }
        if (savedOpenAIKey) {
          setOpenAIKey(savedOpenAIKey);
          setOpenAIKeySaved(true);
        }
      }, []);
           
      
      
    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    }

    const onUserChangedText = (event) => {
        setUserInput(event.target.value)
    }

    const callGenerateEndpoint = async () => {
        setIsGenerating(true);
        setLoading(true);

        console.log("Calling our Supabase completions endpoint...");
        console.log(userInput)
        const { data } = await supabase.functions.invoke("get-completion", {
            body: {
                fileSelection: selectedFile,
                message: userInput,
                userId: session.user.id,
                openAIKey: openAIKey,
            },
        });
  
        console.log(data);
        console.log(data.message)
    
        setAPIOutput(`${data.message}`);
        setLoading(false);
        setShowSuccessCard(true);

        setIsGenerating(false);
          // Optionally, you can hide the success card after some time using setTimeout
        setTimeout(() => {
            setShowSuccessCard(false);
        }, 3000); // Display the success card for 3 seconds
    }      

    const handleSubmitFile = async (event) => {
        try {
          event.preventDefault();
          if (!file) return;
           
          
        console.log(file.name)

        const { data } = await supabase.functions.invoke("process-video", {
            body: {
                filePath: `${session.user.id}/${file.name}`,
                fileName: file.name,
                userId: session.user.id,
                openAIKey: openAIKey,
            },
        });
  
        console.log(data);
    
      } catch (error) {
          console.log("error occured");
        
          console.log(error);
      }
    }

return (
    <div className="create-completion-container">
        {showSuccessCard && (
            <div className="success-card">
                Your answer is ready! 🎉 Scroll down 👀
            </div>
        )}
        <div className="top-container" style={
            {
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                justifyContent: "space-between",
            }}>
            <div className="api-keys-container"  style={{ width: "200px", marginBottom: "-5px" }}>
                <div className="api-keys-wrapper">
                    <div className="assemblyai-key">
                        <label htmlFor="assemblyai-api-key">AssemblyAI API Key:</label>
                        <input
                            type={showAssemblyAIKey ? "text" : "password"}
                            id="assemblyai-api-key"
                            value={assemblyAIKey}
                            onChange={(e) => setAssemblyAIKey(e.target.value)}
                            disabled={assemblyAIKeySaved}
                        />
                        <button
                            className="save-api-key"
                            onClick={saveAssemblyAIKey}
                            disabled={assemblyAIKeySaved}
                        >
                            Save
                        </button>
                        <button className="change-api-key" onClick={changeAssemblyAIKey}>
                            Change
                        </button>
                    </div>
                    <div className="openai-key">
                        <label htmlFor="openai-api-key">OpenAI API Key:</label>
                        <input
                            type={showOpenAIKey ? "text" : "password"}
                            id="openai-api-key"
                            value={openAIKey}
                            onChange={(e) => setOpenAIKey(e.target.value)}
                            disabled={openAIKeySaved}
                        />
                        <button
                            className="save-api-key"
                            onClick={saveOpenAIKey}
                            disabled={openAIKeySaved}
                        >
                            Save
                        </button>
                        <button className="change-api-key" onClick={changeOpenAIKey}>
                            Change
                        </button>
                    </div>
                </div>
            </div>
            <div style={{ width: "250px", marginBottom: "-45%" }}>
                <Select
                    value={selectedFile}
                    onChange={(event) => setSelectedFile(event.target.value)}
                    style={{ width: "250px", textAlign: "center" }}
                >
                <MenuItem value="Search All Recordings">Search All Recordings</MenuItem>
                {fileNames.map((fileObj) => (
                    <MenuItem key={fileObj.file_name} value={fileObj.file_name}>
                    {fileObj.file_name}
                    </MenuItem>
                ))}
                </Select>
            </div>
        </div>
        <p>
            <textarea 
                placeholder='Select the video you want to analyze and ask your question here...' 
                className='prompt-box'
                onChange={onUserChangedText}
            />
        </p>
        <div className="submit-button-container">
            <Button 
                variant="contained" 
                component="span" 
                disabled={loading} 
                onClick={callGenerateEndpoint} 
                sx={{
                    background: '#3f51b5',
                    marginTop: '0.1rem',
                }}>
                {loading ? (
                    <CircularProgress size={24} color="inherit" />
                    ) : (
                    "Submit Question"
                )}
            </Button>
        </div>
        {
            apiOutput && (
                <div className="output">
                    <div className='output-header-container'>
                        <div className='output-header'>
                            <h3>Output</h3>
                        </div>
                    </div>
                    <div className='output-content'>
                        <p>{apiOutput}</p>
                    </div>
                </div>
            )
        }
        </div>
    )
}

export default CreateCompletion;