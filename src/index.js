const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

// create and config server
const server = express();
server.use(cors());
server.use(express.json());

// set template engine middlewares
server.set("view engine", "ejs");

// init express aplication
const serverPort = 4000;
server.listen(serverPort, () => {
  console.log(`Server listening at http://localhost:${serverPort}`);
});

//Le decimos a Node que queremos usar esa base de datos:
const db = new Database("./src/data/database.db", { verbose: console.log });

// api endpoint - quey params movies
server.get("/movies", (req, res) => {
  // query params
  const genderFilterParam = req.query.gender;
  const sortFilterParam = req.query.sort;

  const query = db.prepare(
    `SELECT * FROM movies WHERE gender LIKE ? ORDER BY title ${sortFilterParam}`
  );
  const moviesData = query.all(
    genderFilterParam ? genderFilterParam.toLowerCase() : "%"
  );

  // server response
  const response = {
    success: true,
    movies: moviesData,
  };

  // send server response in json format
  res.json(response);
});

server.post("/login", (req, res) => {
  const query = db.prepare(
    `SELECT * FROM users WHERE email = ? AND password = ?`
  );
  const userLogin = query.get(req.body.email, req.body.password);

  if (userLogin !== undefined) {
    res.json({
      success: true,
      userId: userLogin.userId,
    });
  } else {
    res.json({
      success: false,
      errorMessage: "Usuaria/o no encontrada/o",
    });
  }
});

server.get("/movie/:movieId", (req, res) => {
  const movieId = req.params.movieId;

  const query = db.prepare(`SELECT * FROM movies WHERE id = ?`);
  const selectedMovie = query.get(movieId);

  res.render("movie", selectedMovie);
});

// Registro de nuevas usuarias en el back
server.post("/sign-up", (req, res) => {
  // body params
  const emailSignUpParam = req.body.email;
  const passwordSignUpParam = req.body.password;

  const userSignUpInsert = db.prepare(
    `SELECT * FROM users WHERE email = ? AND password = ?`
  );
  const foundUser = userSignUpInsert.get(emailSignUpParam, passwordSignUpParam);

  if (foundUser === undefined) {
    const query = db.prepare(
      "INSERT INTO users (email, password) VALUES (?, ?)"
    );
    const userSignUp = query.run(emailSignUpParam, passwordSignUpParam);

    res.json({
      success: true,
      userId: userSignUp.lastInsertRowid,
    });
  } else {
    res.json({
      success: false,
      errorMessage: "Usuaria/o ya existente",
    });
  }
});

// endpoint de actualizar el perfil de la usuaria:
server.post("/user/profile", (req, res) => {
  const query = db.prepare(
    `UPDATE users SET name = ?, email = ?, password= ? WHERE userId=?`
  );

  const updateProfile = query.run(
    req.body.name,
    req.body.email,
    req.body.password,
    req.headers["user-id"]
  );
  res.json({
    succes: true,
    userProfile: updateProfile,
  });
});

//endpoint de recuperar los datos del perfil de la usuaria:
server.get("/user/profile", (req, res) => {
  console.log("headers params:", req.headers["user-id"]);
  const userProfile = db.prepare(`SELECT * FROM users WHERE userId = ?`);
  const userDataProfile = userProfile.get(req.headers["user-id"]);
  res.json(userDataProfile);
  console.log(userDataProfile);
});

//endpoint para recuperar las peliculas de la usuaria:
server.get("/user/movies", (req, res) => {
  const userId = req.headers["user-id"];

  const userMovies = db.prepare(
    `SELECT movieId FROM rel_movies_users WHERE userId = ?`
  );
  const movieIds = userMovies.all(userId);

  const moviesIdsQuestions = movieIds.map((id) => "?").join(", "); // que nos devuelve '?, ?'

  // preparamos la segunda query para obtener todos los datos de las películas
  const moviesQuery = db.prepare(
    `SELECT * FROM movies WHERE id IN (${moviesIdsQuestions})`
  );

  // convertimos el array de objetos de id anterior a un array de números
  const moviesIdsNumbers = movieIds.map((movie) => movie.movieId); // que nos devuelve [1.0, 2.0]

  // ejecutamos segunda la query
  const movies = moviesQuery.all(moviesIdsNumbers);

  // respondemos a la petición con
  res.json({
    success: true,
    movies: movies,
  });
});
//Favoritas:
server.post("/user/movies/favourite", (req, res) => {
  const userId = req.headers["user-id"];
  const movieId = req.body.movieId;
  console.log(req.body.movieId);
  const userFavourites = db.prepare(
    `SELECT * FROM rel_movies_users WHERE userId = ? AND movieId = ?`
  );
  const userDataFavourites = userFavourites.get(userId, movieId);
  console.log(userDataFavourites);
  if (userDataFavourites === undefined) {
    const addMovieFav = db.prepare(
      "INSERT INTO rel_movies_users (userId, movieId) VALUES (?, ?)"
    );
    const userFav = addMovieFav.run(userId, movieId);

    res.json({
      userFav: userFav,
    });
  } else {
    const deleteFav = db.prepare(
      "DELETE FROM rel_movies_users WHERE userId = ? and movieId = ?"
    );
    const notFav = deleteFav.run(userId, movieId);
    res.json({
      notFav: notFav,
    });
  }
});

// En esta carpeta ponemos los ficheros estáticos
// static server

const staticServerPathWeb = "./src/public-react";
server.use(express.static(staticServerPathWeb));

// static server of images
const staticServerImagesPathWeb = "./src/public-movies-images/";
server.use(express.static(staticServerImagesPathWeb));

// static server of styles:
const staticServerStylesPathWeb = "./src/public-styles";
server.use(express.static(staticServerStylesPathWeb));
