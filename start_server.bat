@echo off
start cmd /k "cd /d %~dp0 && call env\Scripts\activate.bat && cd quiz_app\backend && python tiktok_server.py && pause"