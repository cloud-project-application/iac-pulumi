This is a Pulumi based Apllication to connect to AWS.

To run the project :
npm install

To build the profile:
pulumi up
pulumi destroy
pulumi refresh

pulumi stack select - dev or demo 


For AWS stack:

Configure aws-cli to create two profiles dev and demo
In AWS console, create two users apart from root which are dev and demo.
Assign a group of read only access on demo and assign 7 users for TA in that group
