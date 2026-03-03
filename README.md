# 🔐 Login-system
Login System with full logic by supabase + fastapi designed by apex_001x
- Backend made with python fastapi(docs)

<p align="left">
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
</p>

- DataBase made with supabase

- Frontend with html, css, js

<p align="left">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white"/>
  <img src="https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css&logoColor=white"/>
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black"/>
</p>

## 📂 Folder Structure

- `backend/`: Python logic & DB saving
- `frontend/`: Web Element Structure, Design & server communication
- `.env.example`: environment variable setting example(guide)

## 🚀 How to Run

1. Library Install: `pip install -r requirements.txt`
2. `.env` file setting ( SUPABASE_URL, SUPABASE_API_KEY, SECRET_KEY )
3. Start Python logic: `uvicorn backend.login:app --reload`

## 💡 Tips

- You can see ui without `.env` setting and Python server
- If you run python server, in `localhost:{port}/docs` you can see the test page.
