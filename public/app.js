const mapData = {
    minX: 0,
    maxX: 14,
    minY: 3,
    maxY: 12,
    blockedSpaces: {
      "7x4": true,
      "1x11": true,
      "12x10": true,
      "4x7": true,
      "5x7": true,
      "6x7": true,
      "8x6": true,
      "9x6": true,
      "10x6": true,
      "7x9": true,
      "8x9": true,
      "9x9": true,
    },
  };

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}

const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];
const maxScoreElm = document.querySelector("#max-score");


function createName() {
    const prefix = randomFromArray([
      "COOL",
      "SUPER",
      "HIP",
      "SMUG",
      "COOL",
      "SILKY",
      "GOOD",
      "SAFE",
      "DEAR",
      "DAMP",
      "WARM",
      "RICH",
      "LONG",
      "DARK",
      "SOFT",
      "BUFF",
      "DOPE",
    ]);
    const animal = randomFromArray([
      "BEAR",
      "DOG",
      "CAT",
      "FOX",
      "LAMB",
      "LION",
      "BOAR",
      "GOAT",
      "VOLE",
      "SEAL",
      "PUMA",
      "MULE",
      "BULL",
      "BIRD",
      "BUG",
    ]);
    return `${prefix} ${animal}`;
  }

function randomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getKeyString(x, y) {
    return `${x}x${y}`;
}

function isSolid(x, y) {
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x,y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x <= mapData.minX ||
    y >= mapData.maxY ||
    y <= mapData.minY 
  );
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js'
import { 
  getDatabase, 
  ref, 
  set, 
  remove,
  onDisconnect, 
  onValue, 
  onChildAdded, 
  onChildRemoved,
  update,
  get,
} from 'https://www.gstatic.com/firebasejs/9.17.2/firebase-database.js'

const firebaseConfig = {
    apiKey: "AIzaSyBElBL6blIgsk53ZhmZFjbjeIWsFrqez0M",
    authDomain: "hangout-15bb2.firebaseapp.com",
    databaseURL: "https://hangout-15bb2-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hangout-15bb2",
    storageBucket: "hangout-15bb2.appspot.com",
    messagingSenderId: "555424356700",
    appId: "1:555424356700:web:de6fa8321a5aab95460999"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


(function () {

    let playerId; //string is out id
    let playerRef; //our firebase ref 
    let placeCoin_pressedRef;
    let pausedRef;
    let maxScoreRef;
    let players = {} //local lists of states like x, y, colors which our firebase will update
    let playerElements = {}; //storing the div of all the characters
    let coins = {};
    let coinElements = {};


    const gameContainer = document.querySelector(".game-container");
    const playerNameInput = document.querySelector("#player-name");
    const playerColorButton = document.querySelector("#player-color");
    const winnerName = document.querySelector(".winner-name");
    const endgameButton = document.querySelector(".endgame-button");
    const placeCoinsButton = document.querySelector(".place-coins-button");


    function placeCoin() {
      
      // console.log("place coin called")
      const {x,y} = getRandomSafeSpot();
      const coinRef = ref(db, 'coins/' + getKeyString(x,y));

      get(pausedRef)
      .then((snapshot) => {
        const paused = snapshot.val();
        if(!paused) {
          set(coinRef, {
            x,
            y,
          })
          const coinTimeouts = [800, 1000, 2000, 3000];
          setTimeout(() => {
            placeCoin();
          }, randomFromArray(coinTimeouts));
        }
      })
      
    }

    function resetCoins(allPlayersRef) {
      get(allPlayersRef).then((snapshot) => {
        snapshot.forEach((childSnapshot) => {
          const updates = {};
          updates[childSnapshot.key + "/coins"] = 0;
          update(allPlayersRef, updates);
          console.log("Resetting " + players[childSnapshot.key].name);
        });
      });
    }

    function stopPlacingCoins(allPlayersRef, allCoinsRef) {
      set(pausedRef, true);
      set(placeCoin_pressedRef, false);
      
      // resetCoins(allPlayersRef); //setting score element on screen to 0
      remove(allCoinsRef); // deleting refs from firebase
      
      Object.keys(coins).forEach((key) =>{
        delete coins[key]; //deleting local states of coins
      });
      console.log("Game Ended");

    }

    function attemptGrabCoin(x, y) {
      const key = getKeyString(x,y);
      if (coins[key]) {
        remove(ref(db, 'coins/' + key));
        update(playerRef, {
          coins: players[playerId].coins + 1,
        })
      }
    }


    function handleArrowPress(xChange, yChange) {
      const newX = players[playerId].x + xChange;
      const newY = players[playerId].y + yChange;
      attemptGrabCoin(newX, newY);
      if(!isSolid(newX, newY)) {
        players[playerId].x = newX;
        players[playerId].y = newY;
        if(xChange===1) players[playerId].direction = "right";
        if(xChange===-1) players[playerId].direction = "left";
      }

      set(playerRef, players[playerId]);
    }

    function initGame() {
      //Movements
      let keySafe = true;
      document.addEventListener("keydown", (e)=>{
        if(keySafe) {
          if(e.key==="ArrowUp") handleArrowPress(0, -1);
          if(e.key==="ArrowDown") handleArrowPress(0, 1);
          if(e.key==="ArrowLeft") handleArrowPress(-1, 0);
          if(e.key==="ArrowRight") handleArrowPress(1, 0);
          
          keySafe=false;
        }
      });
      document.addEventListener("keyup", ()=>{keySafe=true})
      
      //players reference
      const allPlayersRef = ref(db, 'players');
      const allCoinsRef = ref(db, 'coins');
      
      console.log("Game Started")

      let MAX_SCORE = 10;

      maxScoreElm.addEventListener("change", (e) => {
        // console.log(maxScoreElm.value);
        let MAX_SCORE = e.target.value>0 ? e.target.value : 10;
        
        set(maxScoreRef, MAX_SCORE);
      })

      onValue(maxScoreRef, (snapshot) => {
        MAX_SCORE = snapshot.val();
        maxScoreElm.value = MAX_SCORE;
      })
      
      
      //gets called whenever value of any player changes
      onValue(allPlayersRef, (snapshot) => {
        players = snapshot.val() || {};
        Object.keys(players).forEach((key) => {
          const characterState = players[key];
          let el = playerElements[key];

          //now update the dom
          el.querySelector(".character_name").innerText = characterState.name;
          el.querySelector(".character_coins").innerText = characterState.coins;
          el.setAttribute("data-color", characterState.color);
          el.setAttribute("data-direction", characterState.direction);
          const left = 16 * characterState.x + "px";
          const top = 16 * characterState.y - 2 + "px";
          el.style.transform = `translate(${left}, ${top})`;
          
          // MAX SCORE reached by any player, coins paused and scores rest
          if(players[key].coins >= MAX_SCORE && MAX_SCORE) {
            stopPlacingCoins(allPlayersRef, allCoinsRef);
            //add DOM element
            // placeCoinsButton.style.cursor="pointer";

            winnerName.innerHTML = `The winner is <span class='uppercase'>${players[key].name}<span/>!`;
          }
        })
      });

          
        //whenever a new ref is added
        onChildAdded(allPlayersRef, (snapshot) => {
            const addedPlayer = snapshot.val();
            console.log(addedPlayer.name + " joined...")
            
            const characterElement = document.createElement('div');
            characterElement.classList.add('character', 'grid-cell');
            if (addedPlayer.id === playerId) {
                characterElement.classList.add('you');
              }
            characterElement.innerHTML = (`
                <div class="character_shadow grid-cell"></div>
                <div class="character_sprite grid-cell"></div>
                <div class="character_name-container">
                <span class="character_name"></span>
                <span class="character_coins">0</span>
                </div>
                <div class="character_you-arrow"></div>
                `);
                
                playerElements[addedPlayer.id] = characterElement;
                
                characterElement.querySelector(".character_name").innerText = addedPlayer.name;
                characterElement.querySelector(".character_coins").innerText = addedPlayer.coins;
                characterElement.setAttribute("data-color", addedPlayer.color);
                characterElement.setAttribute("data-direction", addedPlayer.direction);
                const left = 16 * addedPlayer.x + "px";
                const top = 16 * addedPlayer.y - 2 + "px";
                characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
                
                gameContainer.appendChild(characterElement);
        })
      
            
            
        //remove character DOM element after they leave
        onChildRemoved(allPlayersRef, (snapshot) => {
          const removedKey = snapshot.val().id;
          gameContainer.removeChild(playerElements[removedKey]);
          delete playerElements[removedKey];
        })
        
        
        //COINS---------------------------------

        onChildAdded(allCoinsRef, (snapshot) => {
          const coin = snapshot.val();
          const key = getKeyString(coin.x, coin.y);
          coins[key] = true;
          
          // Create the DOM Element
          const coinElement = document.createElement("div");
          coinElement.classList.add("coin", "grid-cell");
          coinElement.innerHTML = `
          <div class="coin_shadow grid-cell"></div>
          <div class="coin_sprite grid-cell"></div>
          `;
          
          // Position the Element
          const left = 16 * coin.x + "px";
          const top = 16 * coin.y - 2 + "px";
          coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;
          
          // Keep a reference for removal later and add to DOM
          coinElements[key] = coinElement;
          gameContainer.appendChild(coinElement);
        })
        
        //This block will remove coins from local state when Firebase `coins` value updates
        onValue(allCoinsRef, (snapshot) => {
          coins = snapshot.val() || {};
        })
        
        onChildRemoved(allCoinsRef, (snapshot) => {
          const {x,y} = snapshot.val();
          const keyToRemove = getKeyString(x,y);
          gameContainer.removeChild(coinElements[keyToRemove]);
          delete coinElements[keyToRemove];
        })

        //player info
        playerNameInput.addEventListener("change", (e) => {
          const newName = e.target.value || createName();
          playerNameInput.value = newName;
          update(playerRef, {
            name: newName
          })
        })

        playerColorButton.addEventListener("click", () => {
          const mySkinIndex = playerColors.indexOf(players[playerId].color);
          const nextColor = playerColors[mySkinIndex+1] || playerColors[0];
          update(playerRef, {
            color: nextColor
          })
        })

        endgameButton.addEventListener("click", () => {
          stopPlacingCoins(allPlayersRef, allCoinsRef);
          resetCoins(allPlayersRef); //setting score element on screen to 0
          // placeCoinsButton.style.cursor="pointer";

        })

        // onValue(pausedRef, (snapshot) => {
        //   console.log("pausedRef "+snapshot.val())
        // })
        onValue(placeCoin_pressedRef, (snapshot) => {
          console.log("placeCoin_pressedRef "+snapshot.val())
          if(snapshot.val()) placeCoinsButton.style.cursor="not-allowed";
          else placeCoinsButton.style.cursor="pointer";

        })

        
        
      }   
      
      const auth = getAuth();
      onAuthStateChanged(auth, (user) => {
        
        if (user) {
          
          playerId = user.uid;
          playerRef = ref(db, 'players/' + playerId);
          placeCoin_pressedRef = ref(db, 'placeCoin_pressed');
          pausedRef = ref(db, 'paused'); //check before spawning each coin
          maxScoreRef = ref(db, 'maxScore');
          set(placeCoin_pressedRef, false);
          set(pausedRef, true);
          set(maxScoreRef, 10);

          
          const name = createName();
          playerNameInput.value = name;
          
          const {x,y} = getRandomSafeSpot();
          
          set(playerRef, {
            id: playerId,
            name,
            direction: randomFromArray(["left", "right"]),
            color: randomFromArray(playerColors),
            x,
            y,
            coins: 0,
          });
          
          onDisconnect(playerRef).remove();
          
          
          placeCoinsButton.addEventListener("click", () => {
            
            get(placeCoin_pressedRef)
            .then((snapshot) => {
              const placeCoin_pressed = snapshot.val();
              // Check if the value is false and update it to true
              if (!placeCoin_pressed) {
                // placeCoinsButton.style.cursor="not-allowed";
                
                set(placeCoin_pressedRef, true)
                resetCoins(ref(db, 'players')); //setting score element on screen to 0
                set(pausedRef, false)
                .then(() => {
                  console.log('Placing coins...');
                })
                .catch((error) => {
                  console.log('Error updating placing coin (pausedRef):', error);
                });
                
                placeCoin();
                winnerName.textContent = "";
              }
            })
            .catch((error) => {
              console.log('Error getting placeCoin_pressedRef value:', error);
            });
          });

          initGame();
          
        } else {
        //You're logged out.
        }
    });


    signInAnonymously(auth)
    .then(() => {
        console.log("Signed in Anonymously.")
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(errorCode, errorMessage);
    });


})();


