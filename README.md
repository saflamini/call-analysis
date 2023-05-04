# call-analysis

## A project which enables video call transcription & analysis

A live deployment can be found at: https://call-analysis.vercel.app/

### Core Technologies Used
- AssemblyAI for core transcriptions and & audio intelligence
- OpenAI for embeddings and LLM completions
- Supabase for hosting & edge functions

### Setting Up a Project

1) In ./backend, you'll need to configure your deno settings and familiarize yourself with the supabase CLI to use functions. A good resource on this can be found [here](https://supabase.com/docs/guides/functions)
2) Get your Supabase DB URL and Anon Key and add it to your functions. `process-video` handles all uploads, transcriptions, and conversion of AssemblyAI's automatically generated chapters into embeddings which are stored & associated with a user's ID. To use these functions, you'll need both an OpenAI key and AssemblyAI key
3) In ./frontend, install deps with `npm install`
4) Add your Supabase URL and Anon Key as .env variables
5) Run `npm run start` to start project.