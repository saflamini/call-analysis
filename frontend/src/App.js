import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { SocialLayout, ThemeSupa, ViewType } from '@supabase/auth-ui-shared'
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import UploadVideos from './UploadVideos';
import CreateCompletion from './CreateCompletion';

let supabase;

function App() {

  supabase = createClient(process.env.REACT_APP_SUPABASE_URL, `${process.env.REACT_APP_SUPABASE_ANON}`)

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [theme, setTheme] = useState('light')
  const [manRefreshKey, setManRefreshKey] = useState(0)
  const [assemblyAIKey, setAssemblyAIKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');

  const handleSaveAssemblyAIKey = (key) => {
    setAssemblyAIKey(key);
  };
  
  const handleSaveOpenAIKey = (key) => {
    setOpenAIKey(key);
  };


  const onFileUploadFinish = () => {
    setManRefreshKey((prevKey) => prevKey + 1);
  };
  

  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  async function signInWithEmail() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
  }

  const handleSignOut = () => {
    signOut();
    setAnchorEl(null);
  }

  const handleSignIn = () => {
    signInWithEmail();
    setAnchorEl(null);
  }

  const [session, setSession] = useState(null)

  //gets the session from supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    const storedAssemblyAIKey = localStorage.getItem("assemblyAIKey");
    const storedOpenAIKey = localStorage.getItem("openAIKey");

    if (storedAssemblyAIKey) {
      setAssemblyAIKey(storedAssemblyAIKey);
    }

    if (storedOpenAIKey) {
      setOpenAIKey(storedOpenAIKey);
    }
    
    return () => subscription.unsubscribe()
  }, [])

  async function signInWithEmail() {
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: 'https://example.com/welcome', //not used - for reference for future dev
      },
    })
  }


  if (!session) {
    return (
        <div className='login-page'>
          <div >
          <h1 className='login-header'>Call Analysis with AssemblyAI 🔥</h1>
          </div>
          <div className="login-modal">
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
              }}
              providers={[]}
            />
            </div>
          </div>
        )
  }

  else {
    return (
      <div>
        <div>
        <Button
          id="basic-button primary"
          aria-controls={open ? 'basic-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
          onClick={handleClick}
         >
          Menu
        </Button>
        <Menu
          id="basic-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'basic-button',
          }}
        >
          <MenuItem onClick={handleClose}>Profile</MenuItem>
          <MenuItem onClick={handleSignOut}>Logout</MenuItem>
          </Menu>
        </div>
        <h1 className='app-header'>Call Analysis with AssemblyAI 🔥</h1>
        <div >
          <h2 className='app-upload'>Upload a New File Below</h2>
          <div className='file-upload'>
          <UploadVideos
            assemblyAIKey={assemblyAIKey}
            openAIKey={openAIKey}
            onFileUploadFinish={onFileUploadFinish}
            supabaseClient={supabase}
            loggedInUser={session}
          />
          </div>
        </div>
        <div className='create-completion'>
          <CreateCompletion 
            manRefreshKey={manRefreshKey} 
            onSaveAssemblyAIKey={handleSaveAssemblyAIKey}
            onSaveOpenAIKey={handleSaveOpenAIKey}
            supabaseClient={supabase}
            loggedInUser={session}
          />
        </div>
      </div>
    )
  }
}

export default App;
