import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";

// Load the spritesheet (same for all scenes)
k.loadSprite("spritesheet", "./spritesheet.png", {
  sliceX: 39,
  sliceY: 31,
  anims: {
    "idle-down": 936,
    "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
    "idle-side": 975,
    "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
    "idle-up": 1014,
    "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
  },
});

// Scene configuration
const scenes = {
  "scene1": { mapFile: "./scene1.png", jsonFile: "./scene1.json" },
  "scene2": { mapFile: "./scene2.png", jsonFile: "./scene2.json" },
  "scene3": { mapFile: "./scene3.png", jsonFile: "./scene3.json" },
  "scene4": { mapFile: "./scene4.png", jsonFile: "./scene4.json" },
  "scene5": { mapFile: "./scene5.png", jsonFile: "./scene5.json" },
  "scene6": { mapFile: "./scene6.png", jsonFile: "./scene6.json" },
  "scene7": { mapFile: "./scene7.png", jsonFile: "./scene7.json" },
  "scene8": { mapFile: "./scene8.png", jsonFile: "./scene8.json" },
  // Add more scenes as needed: "scene3": { mapFile: "./map3.png", jsonFile: "./map3.json" }
};

// Function to create a scene
function createScene(sceneName) {
  // Load scene-specific map
  k.loadSprite(`map-${sceneName}`, scenes[sceneName].mapFile);

  k.scene(sceneName, async (fromScene = null) => {
    const mapData = await (await fetch(scenes[sceneName].jsonFile)).json();
    const layers = mapData.layers;

    const map = k.add([k.sprite(`map-${sceneName}`), k.pos(0), k.scale(scaleFactor)]);

    const player = k.make([
      k.sprite("spritesheet", { anim: "idle-down" }),
      k.area({
        shape: new k.Rect(k.vec2(0, 3), 10, 10),
      }),
      k.body(),
      k.anchor("center"),
      k.pos(),
      k.scale(scaleFactor),
      {
        speed: 200,
        direction: "down",
        isInDialogue: false,
      },
      "player",
    ]);

    for (const layer of layers) {
      if (layer.name === "boundaries") {
        for (const boundary of layer.objects) {
          const boundaryObj = map.add([
            k.area({
              shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
            }),
            k.body({ isStatic: true }),
            k.pos(boundary.x, boundary.y),
            boundary.name,
          ]);

          if (boundary.name) {
            // Handle dialogue boundaries
            if (dialogueData[boundary.name]) {
              player.onCollide(boundary.name, () => {
                player.isInDialogue = true;
                displayDialogue(
                  dialogueData[boundary.name],
                  () => (player.isInDialogue = false)
                );
              });
            }
            // Handle portal boundaries
            else if (boundary.name.startsWith("inn") || boundary.name === "out") {
              player.onCollide(boundary.name, () => {
                let targetScene;
                switch(boundary.name) {
                  case "inn1": targetScene = "scene2"; break;
                  case "inn2": targetScene = "scene3"; break;
                  case "inn3": targetScene = "scene4"; break;
                  case "inn4": targetScene = "scene5"; break;
                  case "inn5": targetScene = "scene6"; break;
                  case "inn6": targetScene = "scene7"; break;
                  case "inn7": targetScene = "scene8"; break;
                  case "inn8": targetScene = "scene6"; break;


                  // Add more portal mappings as needed
                }
                if (targetScene) {
                  k.go(targetScene, sceneName);
                }
              });
            }
          }
        }
        continue;
      }

      if (layer.name === "spawnpoints") {
        for (const entity of layer.objects) {
          if (entity.name === "player") {
            let spawnX = entity.x;
            let spawnY = entity.y;
            
            // Adjust spawn position based on where we came from
            if (fromScene) {
              const entryPoint = layers.find(l => l.name === "boundaries")
                ?.objects.find(o => o.name === (sceneName === "scene1" ? "out" : "inn1"));
              if (entryPoint) {
                spawnX = entryPoint.x + entryPoint.width / 2;
                spawnY = entryPoint.y + entryPoint.height;
              }
            }
            
            player.pos = k.vec2(
              (map.pos.x + spawnX) * scaleFactor,
              (map.pos.y + spawnY) * scaleFactor
            );
            k.add(player);
          }
        }
      }
    }

    // Rest of your original code (camera, controls, etc.) remains unchanged
    setCamScale(k);

    k.onResize(() => {
      setCamScale(k);
    });

    k.onUpdate(() => {
      k.camPos(player.worldPos().x, player.worldPos().y - 100);
    });

    k.onMouseDown((mouseBtn) => {
      if (mouseBtn !== "left" || player.isInDialogue) return;

      const worldMousePos = k.toWorld(k.mousePos());
      player.moveTo(worldMousePos, player.speed);

      const mouseAngle = player.pos.angle(worldMousePos);

      const lowerBound = 50;
      const upperBound = 125;

      if (
        mouseAngle > lowerBound &&
        mouseAngle < upperBound &&
        player.curAnim() !== "walk-up"
      ) {
        player.play("walk-up");
        player.direction = "up";
        return;
      }

      if (
        mouseAngle < -lowerBound &&
        mouseAngle > -upperBound &&
        player.curAnim() !== "walk-down"
      ) {
        player.play("walk-down");
        player.direction = "down";
        return;
      }

      if (Math.abs(mouseAngle) > upperBound) {
        player.flipX = false;
        if (player.curAnim() !== "walk-side") player.play("walk-side");
        player.direction = "right";
        return;
      }

      if (Math.abs(mouseAngle) < lowerBound) {
        player.flipX = true;
        if (player.curAnim() !== "walk-side") player.play("walk-side");
        player.direction = "left";
        return;
      }
    });

    function stopAnims() {
      if (player.direction === "down") {
        player.play("idle-down");
        return;
      }
      if (player.direction === "up") {
        player.play("idle-up");
        return;
      }
      player.play("idle-side");
    }

    k.onMouseRelease(stopAnims);

    k.onKeyRelease(() => {
      stopAnims();
    });

    k.onKeyDown((key) => {
      const keyMap = [
        k.isKeyDown("right"),
        k.isKeyDown("left"),
        k.isKeyDown("up"),
        k.isKeyDown("down"),
      ];

      let nbOfKeyPressed = 0;
      for (const key of keyMap) {
        if (key) {
          nbOfKeyPressed++;
        }
      }

      if (nbOfKeyPressed > 1) return;

      if (player.isInDialogue) return;
      if (keyMap[0]) {
        player.flipX = false;
        if (player.curAnim() !== "walk-side") player.play("walk-side");
        player.direction = "right";
        player.move(player.speed, 0);
        return;
      }

      if (keyMap[1]) {
        player.flipX = true;
        if (player.curAnim() !== "walk-side") player.play("walk-side");
        player.direction = "left";
        player.move(-player.speed, 0);
        return;
      }

      if (keyMap[2]) {
        if (player.curAnim() !== "walk-up") player.play("walk-up");
        player.direction = "up";
        player.move(0, -player.speed);
        return;
      }

      if (keyMap[3]) {
        if (player.curAnim() !== "walk-down") player.play("walk-down");
        player.direction = "down";
        player.move(0, player.speed);
      }
    });
  });
}

// Create all scenes
Object.keys(scenes).forEach(sceneName => createScene(sceneName));

// Set background and start game
k.setBackground(k.Color.fromHex("#311047"));
k.go("scene1");

document.addEventListener("DOMContentLoaded", () => {
  const musicPlayer = document.getElementById("bg-music");

  // List of songs in your folder (make sure these files exist)
  const songs = [
    "music/song1.mp3",
    "music/song2.mp3",
    "music/song3.mp3"
  ];

  // Function to shuffle and play a random song
  function playRandomSong() {
    const randomIndex = Math.floor(Math.random() * songs.length);
    musicPlayer.src = songs[randomIndex];
    musicPlayer.play();
  }

  // Play a new song when the previous one ends
  musicPlayer.addEventListener("ended", playRandomSong);

  // Start playing when the game begins
  document.getElementById("start-button").addEventListener("click", () => {
    playRandomSong();
  });
});