# EasyBooking

<a name="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/Uni-Progetti/EasyBooking">
    <img src="./app/public/images/logo_readme.svg" alt="Logo" width="200" height="200">
  </a>

<h3 align="center">EasyBooking</h3>

  <p align="center">
    Web App for reservations
    <br />
    <a href="https://github.com/Uni-Progetti/EasyBooking"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/Uni-Progetti/EasyBooking">View Demo</a>
    ·
    <a href="https://github.com/Uni-Progetti/EasyBooking/issues">Report Bug</a>
    ·
    <a href="https://github.com/Uni-Progetti/EasyBooking/issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Lista Contenuti</summary>
  <ol>
    <li>
      <a href="#about-the-project">EasyBooking</a>
      <ul>
        <li><a href="#built-with">Scritto Con</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#test">Test</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## Struttura di EasyBooking

[![App screenshot][product-screenshot]](https://example.com)



<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Creato Con

[![GitHub Actions][GitHub Actions]][GitHub Actions-url]
[![Bootstrap][Bootstrap.com]][Bootstrap-url]
[![Babel]][Babel-url]
[![Docker]][Docker-url]
[![Nginx]][Nginx-url]
[![Mocha]][Mocha-url]
[![Express]][Express-url]
[![JWT]][JWT-url]
[![NPM]][NPM-url]
[![Nodejs]][Nodejs-url]
[![Pug]][Pug-url]
[![Rabbitmq]][Rabbitmq-url]
[![Javascript]][Javascript-url]
[![Gmail]][Gmail-url]
[![Couchdb]][Couchdb-url]
<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Primo avvio

EasyBooking uses Docker and Nodejs to install both refer to their documentation at 

>[Install Docker](https://docs.docker.com/get-docker/)

>[Install NVM](https://github.com/nvm-sh/nvm)

To get a local copy up and running follow these simple example steps.

### Prerequisiti

Aggiornare npm alla versione più recente
* npm
  ```sh
  npm install npm@latest -g
  ```

### Installazione

1. Clonare la repo
   ```sh
   git clone https://github.com/Uni-Progetti/EasyBooking.git
   cd EasyBooking
   ```
2. Installare NPM packages
   ```sh
   npm install
   ```
3. Crea il tuo file .env nella cartella principale dell'app e salva al suo interno i seguenti valori
    ```sh
    # EasyBooking/.env
    GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'
    GOOGLE_CLIENT_SECRET = 'YOUR_GOOGLE_CLIENT_SECRET'
    COUCHDB_USER = 'YOUR_COUCHDB_USER'
    COUCHDB_PASSWORD = 'YOUR_COUCHDB_PASSWORD'
    SESS_NAME = 'YOUR_SESS_NAME'
    SESSION_SECRET = 'YOUR_SESSION_SECRET'
    AMQP_URL = 'YOUR_AMQP_URL'
    APP_EMAIL = 'YOUR_APP_EMAIL'
    APP_EMAIL_PASS = 'YOUR_APP_EMAIL_PASS'
    ACCESS_TOKEN_SECRET = 'YOUR_ACCESS_TOKEN_SECRET'
    REFRESH_TOKEN_SECRET = 'YOUR_REFRESH_TOKEN_SECRET'
    ABSTRACT_API_KEY = 'YOUR_ABSTRACT_API_KEY'
    ```
4. Crea una cartella di nome certs nella directory nginx e genera al suo interno certificato ssl e chiave
    ```
    mkdir /nginx/certs
    cd /nginx/certs
    openssl req -new -newkey rsa:2048 -nodes -keyout nginx.key -out nginx.csr
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx.key -out nginx.crt
    openssl dhparam -out dhparam.pem 2048
5. Avvia l'app con lo script di bash start.sh che si trova nella cartella principale dell'app 
    ```sh
    # EasyBooking/
    ./start.sh
    ```
6. Configure the db
    ```sh
    # EasyBooking/
    node app/db_first_start.js
    ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Utilizzo

Una volta completata l'installazione ed eseguito il primo avvio puoi accedere alla homepage dell'app all'indirizzo:
```sh
http://localhost:8080
```
o per la versione https:
```sh
https://localhost:8083
```
EasyBooking fornisce inoltre una API con diverse funzioni.
L'API dell' app richiede di essere in possesso di un account registrato e di credenziali valide.<br>
L'accesso alle funzioni API è protetto con <a href="https://jwt.io/">Json Web Token</a> sarà quindi necessario utilizzare le proprie credenziali per ottenere un token da utilizzare nelle richieste API verso EasyBooking.
```sh
// Autenticazione API
curl -d '{"username": "YOUR_USERNAME", "password": "YOUR_PASSWORD"}' -H "Content-Type: application/json" -X POST http://localhost:8080/api/login 

// Ricezione access_token e refresh_token
response: {access_token: "YOUR_ACCESS_TOKEN", refresh_token: "YOUR_REFRESH_TOKEN"}

// Invio richiesta API con access_token appena ricevuto
curl http://localhost:8080/api/getDepartments/all -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

```

_Per maggiori informazioni puoi consultare la documentazione [API Documentation](http://localhost:8080/apidoc)_

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Test

The app uses the module [Mocha](https://mochajs.org/) fo testing. You can run the test from the app folder using this command
```sh
# EasyBooking/app/
npm test
```

<!-- ROADMAP -->
<!-- ## Roadmap

- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3
    - [ ] Nested Feature

See the [open issues](https://github.com/Uni-Progetti/EasyBooking/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p> -->



<!-- CONTRIBUTING -->
<!-- ## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p> -->



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact
Matteo Tedesco - easybooking.adm@gmail.com</br>
Michela Fuselli - easybooking.adm@gmail.com</br>
Francesco Guarino - easybooking.adm@gmail.com

Project Link: [https://github.com/Uni-Progetti/EasyBooking](https://github.com/Uni-Progetti/EasyBooking)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
<!-- ## Acknowledgments

* []()
* []()
* []()

<p align="right">(<a href="#readme-top">back to top</a>)</p> -->



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/Uni-Progetti/EasyBooking.svg?style=for-the-badge
[contributors-url]: https://github.com/Uni-Progetti/EasyBooking/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Uni-Progetti/EasyBooking.svg?style=for-the-badge
[forks-url]: https://github.com/Uni-Progetti/EasyBooking/network/members
[stars-shield]: https://img.shields.io/github/stars/Uni-Progetti/EasyBooking.svg?style=for-the-badge
[stars-url]: https://github.com/Uni-Progetti/EasyBooking/stargazers
[issues-shield]: https://img.shields.io/github/issues/Uni-Progetti/EasyBooking.svg?style=for-the-badge
[issues-url]: https://github.com/Uni-Progetti/EasyBooking/issues
[license-shield]: https://img.shields.io/github/license/Uni-Progetti/EasyBooking?style=for-the-badge
[license-url]: https://github.com/Uni-Progetti/EasyBooking/blob/master/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/linkedin_username
[product-screenshot]: images/screenshot.png
[GitHub Actions]: https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white
[Github Actions-url]: https://github.com/features/actions
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com
[Babel]: https://img.shields.io/badge/Babel-F9DC3e?style=for-the-badge&logo=babel&logoColor=black
[Babel-url]: https://babeljs.io/
[Docker]: https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[Nginx]: https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white
[Nginx-url]: https://www.nginx.com/
[Mocha]: https://img.shields.io/badge/-mocha-%238D6748?style=for-the-badge&logo=mocha&logoColor=white
[Mocha-url]: https://mochajs.org/
[Express]: https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB
[Express-url]: https://expressjs.com/
[JWT]: https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens
[JWT-url]: https://jwt.io/
[NPM]: https://img.shields.io/badge/NPM-%23000000.svg?style=for-the-badge&logo=npm&logoColor=white
[NPM-url]: https://www.npmjs.com/
[Nodejs]: https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white
[Nodejs-url]: https://nodejs.org/
[Pug]: https://img.shields.io/badge/Pug-FFF?style=for-the-badge&logo=pug&logoColor=A86454
[Pug-url]: https://pugjs.org/
[Rabbitmq]: https://img.shields.io/badge/Rabbitmq-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white
[Rabbitmq-url]: https://www.rabbitmq.com/
[Javascript]: https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E
[Javascript-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[Gmail]: https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white
[Gmail-url]: https://www.google.com/intl/en/gmail/about/
[Couchdb]: https://img.shields.io/badge/Couchdb-EA2328?style=for-the-badge&logo=couchbase&logoColor=white
[Couchdb-url]: https://couchdb.apache.org/
