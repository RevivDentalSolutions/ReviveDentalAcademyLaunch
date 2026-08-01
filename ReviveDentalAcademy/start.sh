#!/bin/bash
cd /home/team/shared/revive-dental-academy
nohup node server/ai-server.js > ai-server.log 2>&1 &
nohup node server/stripe-server.js > stripe-server.log 2>&1 &
nohup npm run dev -- --port 5173 --host > dev-server.log 2>&1 &
sleep 2
disown -a
