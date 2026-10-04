INSTRUCTIONS TO RUN THIS PROJECT:

1. Install Software:
   - Install Node.js (https://nodejs.org/)
   - Install MySQL Server and Workbench.

2. Setup Database:
   - Open MySQL Workbench.
   - Open the "SQL.sql" file from this folder.
   - Run the script to create the 'sanitation_system' database.
   - IMPORTANT: Check 'server.js' line 30. If your MySQL password is not 'root123', change it there.

3. Install Dependencies:
   - Open a terminal in this folder.
   - Run command: npm install

4. Start Server:
   - Run command: node server.js
   - Open browser to: http://localhost:3000/Home.html