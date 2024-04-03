@echo off
:Start
node aws.js
:: restarting in 5 seconds.
TIMEOUT /T 5
GOTO:Start