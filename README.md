# Node-App

Dockerizing a simple NodeJS App

1. Create a project directory and clone the repository..(redis and ES to be changed)
    > mkdir <directory_name>

    > git clone https://github.com/jmathiasj/node-app.git
  
2. A package.json file consists of the app dependencies Running the command to install all the dependencies  
    > npm install
3. Running the command will run the app.js
    > npm start
  
The Application can be accessed on : [http://localhost:5000/](http://localhost:5000/)


To run the same NodeJs application inside a docker container an image needs to created 

Steps to create a Docker Image for the NodeJS application
   
4. To create a **Dockerfile**
    > touch Dockerfile
5. The following is added in the Dockerfile
```
    FROM node:10.16.0-alpine
    WORKDIR /app
    COPY package*.json /app
    RUN npm install
    COPY . /app
    EXPOSE 5000
    CMD ["npm", "start"]

```
6. A **.dockerignore** file is created and the following is added
 
```
    node_modules
```
   
7. To build the docker image
    > docker build -t node-app .
<!--     
    <p align="center">
        <img
          alt="Node.js"
          src="image2.png"
          width="400"
        />
      </p> -->
8. To check Docker images
    > docker images
    
    <!-- <p align="center">
        <img
          alt="Node.js"
          src="image3.png"
          width="400"
        />
      </p> -->
9. To run the docker image
    > docker run -p 5000:5000 -d node-app
 
10. To get the container id
    > docker ps
    
    <!-- <p align="center">
        <img
          alt="Node.js"
          src="image4.png"
          width="400"
        />
      </p>
       -->
11. The application can be accessed on: [http://localhost:5000/](http://localhost:5000/)
  
  <!-- <p align="center">
        <img
          alt="Node.js"
          src="image5.png"
          width="400"
        />
      </p> -->
    