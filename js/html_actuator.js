function HTMLActuator() {
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");
  this.sharingContainer = document.querySelector(".score-sharing");

  this.score = 0; this.max=5;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);

    grid.cells.forEach(function (column) {
      column.forEach(function (cell) {
        if (cell) {
          self.addTile(cell);
        }
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

 
    self.max = metadata.max;    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continue = function () {
  if (typeof ga !== "undefined") {
    ga("send", "event", "game", "restart");
  }

  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, positionClass];

  if (tile.value > 2000000) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  inner.classList.add("tile-inner");
  inner.textContent = tile.value;

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[2] = self.positionClass({ x: tile.x, y: tile.y });
      self.applyClasses(wrapper, classes); // Update the position
    });
  } else if (tile.mergedFrom) {
    classes.push("tile-merged");
    this.applyClasses(wrapper, classes);

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    classes.push("tile-new");
    this.applyClasses(wrapper, classes);
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "Nyertel!" : "Nincs tobb lepes. Vege a jateknak!";

  

  // Build some firebase references.
  var rootRef = new Firebase('https://10000-ft.firebaseio.com');
var scoreListRef = rootRef.child("pontszam_lista");
  var highestScoreRef = rootRef.child("rekord");
  var RefPlays = rootRef.child("jatekszam");
  var Ref500 = rootRef.child("500_elerve");
  var Ref1000 = rootRef.child("1000_elerve");
  var Ref2000 = rootRef.child("2000_elerve");
  var Ref5000 = rootRef.child("5000_elerve");
  var Ref10000 = rootRef.child("10000_elerve");
  var Ref20000 = rootRef.child("20000_elerve");

  // Keep a mapping of firebase locations to HTML elements, so we can move / remove elements as necessary.
  var htmlForPath = {};

  // Helper function that takes a new score snapshot and adds an appropriate row to our leaderboard table.
  function handleScoreAdded(scoreSnapshot, prevScoreName) {
    var newScoreRow = $("<tr/>");
    newScoreRow.append($("<td/>").append($("<em/>").text(scoreSnapshot.val().name)));
    newScoreRow.append($("<td/>").text(scoreSnapshot.val().score));

    // Store a reference to the table row so we can get it again later.
    htmlForPath[scoreSnapshot.name()] = newScoreRow;

    // Insert the new score in the appropriate place in the table.
    if (prevScoreName === null) {
      $("#leaderboardTable").append(newScoreRow);
    }
    else {
      var lowerScoreRow = htmlForPath[prevScoreName];
      lowerScoreRow.before(newScoreRow);
    }
  }


  // Helper function to handle a score object being removed; just removes the corresponding table row.
  function handleScoreRemoved(scoreSnapshot) {
    var removedScoreRow = htmlForPath[scoreSnapshot.name()];
    removedScoreRow.remove();
    delete htmlForPath[scoreSnapshot.name()];
  }

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 6; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

  // Create a view to only receive callbacks for the last LEADERBOARD_SIZE scores
  var scoreListView = scoreListRef.limit(10);
  // Add a callback to handle when a new score is added.
  scoreListView.on('child_added', function (newScoreSnapshot, prevScoreName) {
    handleScoreAdded(newScoreSnapshot, prevScoreName);
  });

  // Add a callback to handle when a score is removed
  scoreListView.on('child_removed', function (oldScoreSnapshot) {
    handleScoreRemoved(oldScoreSnapshot);
  });

  // Add a callback to handle when a score changes or moves positions.
  var changedCallback = function (scoreSnapshot, prevScoreName) {
    handleScoreRemoved(scoreSnapshot);
    handleScoreAdded(scoreSnapshot, prevScoreName);
  };
  scoreListView.on('child_moved', changedCallback);
  scoreListView.on('child_changed', changedCallback);
      var newScore = this.score;
      var name = makeid();
      $("#scoreInput").val("");

      var userScoreRef = scoreListRef.child(name);

      // Use setWithPriority to put the name / score in Firebase, and set the priority to be the score.
      userScoreRef.setWithPriority({ id:name, pont:newScore, max:this.max }, newScore);

// Track the highest score using a transaction.  A transaction guarantees that the code inside the block is
      // executed on the latest data from the server, so transactions should be used if you have multiple
      // clients writing to the same data and you want to avoid conflicting changes.
      highestScoreRef.transaction(function (currentHighestScore) {
        if (currentHighestScore === null || newScore > currentHighestScore) {
          // The return value of this function gets saved to the server as the new highest score.
          return newScore;
        }
        // if we return with no arguments, it cancels the transaction.
        return;
      });

    RefPlays.transaction(function(current_value) {
      return current_value + 1;
    });


if (this.max >= 500){
     Ref500.transaction(function(current_value) {
      return current_value + 1;
    });
  }

if (this.max >= 1000){
     Ref1000.transaction(function(current_value) {
      return current_value + 1;
    });
  }

if (this.max >= 2000){
     Ref2000.transaction(function(current_value) {
      return current_value + 1;
    });
  }

if (this.max >= 5000){
     Ref5000.transaction(function(current_value) {
      return current_value + 1;
    });
  }

if (this.max >= 10000){
     Ref10000.transaction(function(current_value) {
      return current_value + 1;
    });
  }

if (this.max >= 20000){
     Ref20000.transaction(function(current_value) {
      return current_value + 1;
    });
  }

  // Add a callback to the highest score in Firebase so we can update the GUI any time it changes.
  highestScoreRef.on('value', function (newHighestScore) {
    $("#highestScoreDiv").text(newHighestScore.val());
  });

if (typeof ga !== "undefined") {
    ga("send", "event", "game", "end", type, this.score);
  }

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;

  this.clearContainer(this.sharingContainer);
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
