@echo off

:: 切换到backend目录
cd backend

:: 显示当前目录
echo 当前目录: %cd%

:: 启动生产环境
echo 启动生产环境...
npm start

pause