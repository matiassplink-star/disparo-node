!macro customInstall
    ; Cria o .env com as configurações de produção no diretório de instalação
    FileOpen $0 "$INSTDIR\.env" w
    FileWrite $0 "SUPABASE_URL=https://wtuekhnwtjqszisywydu.supabase.co$\r$\n"
    FileWrite $0 "SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dWVraG53dGpxc3ppc3l3eWR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzkzNjUsImV4cCI6MjA5MzMxNTM2NX0.bxbVyjmrDASXp3xRwM8GBrIQbmt5-NV8L78I-FETfZ4$\r$\n"
    FileWrite $0 "ZAPLINK_SECRET=ZapLinkDesktop_2026_Secure$\r$\n"
    FileClose $0
!macroend
