import Phaser from "phaser";

const WORLD_W = 1800;
const WORLD_H = 1100;

export function createWorld(parent) {
  class FirstShore extends Phaser.Scene {
    constructor() {
      super("FirstShore");
      this.touchDirections = new Set();
    }

    create() {
      this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
      this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
      this.drawOcean();
      this.drawIsland();
      this.drawWorldDetails();
      this.createPlayer();
      this.createBirds();
      this.createAtmosphere();
      this.createWeather();
      this.createInteractionPrompt();
      this.cameras.main.startFollow(this.player, true, 0.075, 0.075);
      this.cameras.main.setZoom(1.08);
      this.cameras.main.setDeadzone(110, 70);
      this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E");
      this.game.events.on("touch-move", this.onTouchMove, this);
      this.game.events.on("interact", this.inspectNearby, this);
      this.game.events.on("builder:start", this.startBuilding, this);
      this.game.events.on("builder:cancel", this.cancelBuilding, this);
      this.loadPlacedObjects();
      this.input.on("pointerdown", this.handleBuildPointer, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.game.events.off("touch-move", this.onTouchMove, this);
        this.game.events.off("interact", this.inspectNearby, this);
        this.game.events.off("builder:start", this.startBuilding, this);
        this.game.events.off("builder:cancel", this.cancelBuilding, this);
        this.input.off("pointerdown", this.handleBuildPointer, this);
      });
      this.updateLighting();
      this.time.addEvent({ delay: 60000, loop: true, callback: () => this.updateLighting() });
    }

    onTouchMove(direction, active) {
      active ? this.touchDirections.add(direction) : this.touchDirections.delete(direction);
    }

    drawOcean() {
      const g = this.add.graphics();
      g.fillGradientStyle(0x18343a, 0x18343a, 0x10252c, 0x10252c, 1);
      g.fillRect(0, 0, WORLD_W, WORLD_H);
      for (let y = 22; y < WORLD_H; y += 38) {
        for (let x = 16; x < WORLD_W; x += 44) {
          const seed = Math.sin(x * 0.031 + y * 0.017);
          const alpha = 0.045 + (seed + 1) * 0.025;
          g.fillStyle(seed > 0 ? 0x8aa5a0 : 0x071b23, alpha);
          g.fillRect(x + (y % 3) * 4, y, 8 + (Math.abs(seed) * 9 | 0), 2);
        }
      }
      for (let i = 0; i < 34; i++) {
        const x = 50 + (i * 173) % (WORLD_W - 100);
        const y = 40 + (i * 251) % (WORLD_H - 80);
        g.fillStyle(0xa8c2b6, 0.09);
        g.fillRect(x, y, 18, 2);
        g.fillRect(x + 7, y - 2, 9, 1);
      }
      g.destroy();
    }

    drawIsland() {
      const points = [
        new Phaser.Geom.Point(180,410),new Phaser.Geom.Point(255,300),new Phaser.Geom.Point(420,240),
        new Phaser.Geom.Point(590,205),new Phaser.Geom.Point(760,235),new Phaser.Geom.Point(920,185),
        new Phaser.Geom.Point(1110,230),new Phaser.Geom.Point(1285,315),new Phaser.Geom.Point(1450,390),
        new Phaser.Geom.Point(1535,540),new Phaser.Geom.Point(1470,700),new Phaser.Geom.Point(1330,815),
        new Phaser.Geom.Point(1160,885),new Phaser.Geom.Point(970,900),new Phaser.Geom.Point(800,850),
        new Phaser.Geom.Point(630,900),new Phaser.Geom.Point(440,825),new Phaser.Geom.Point(290,735),
        new Phaser.Geom.Point(190,600)
      ];
      this.landPolygon = new Phaser.Geom.Polygon(points);
      const g = this.add.graphics();
      g.fillStyle(0x0a1b20, 0.55);
      g.fillPoints(points.map(p => new Phaser.Geom.Point(p.x + 0, p.y + 18)), true);
      g.fillStyle(0x4b5140, 1);
      g.fillPoints(points, true);
      const inner = points.map((p, i) => {
        const cx = 850, cy = 550;
        return new Phaser.Geom.Point(cx + (p.x - cx) * 0.94, cy + (p.y - cy) * 0.94);
      });
      g.fillStyle(0x7b8662, 1);
      g.fillPoints(inner, true);
      g.fillStyle(0x89906b, 0.72);
      g.fillEllipse(850, 520, 1100, 560);
      g.fillStyle(0x657b5d, 0.48);
      g.fillEllipse(650, 650, 530, 260);
      g.fillStyle(0x9a956e, 0.5);
      g.fillEllipse(1130, 410, 330, 170);
      g.lineStyle(3, 0x354b40, 0.85);
      g.strokePoints(points, true);
      g.destroy();
      this.applyGroundTexture(points);
      this.drawCoast(points);
      this.createCoastGlints(points);

      const grass = this.add.graphics().setDepth(3);
      for (let i = 0; i < 900; i++) {
        const x = 280 + ((i * 97) % 1110);
        const y = 270 + ((i * 61) % 580);
        const dx = (x - 850) / 680, dy = (y - 550) / 350;
        if (dx * dx + dy * dy > 0.88) continue;
        const c = [0x536d50,0x667852,0x9b9a6b,0x435e4c][i % 4];
        grass.fillStyle(c, 0.3 + (i % 4) * 0.09);
        grass.fillRect(x, y, i % 7 === 0 ? 3 : 2, i % 5 === 0 ? 4 : 2);
      }
      grass.destroy();
      this.drawPath();
    }

    applyGroundTexture(points) {
      if (!this.textures.exists("muse-ground")) {
        const texture = this.textures.createCanvas("muse-ground", 128, 128);
        const ctx = texture.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = "#77815d";
        ctx.fillRect(0, 0, 128, 128);
        let seed = 918273;
        const random = () => {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          return seed / 4294967296;
        };
        const soil = ["#697650","#6f7c55","#849064","#90936a","#596f51","#a19a70"];
        for (let i = 0; i < 1450; i++) {
          const x = Math.floor(random() * 128);
          const y = Math.floor(random() * 128);
          const size = random() > .88 ? 3 : random() > .56 ? 2 : 1;
          ctx.globalAlpha = .2 + random() * .42;
          ctx.fillStyle = soil[Math.floor(random() * soil.length)];
          ctx.fillRect(x, y, size, size);
        }
        // Small clusters of grass create a hand-laid pixel texture.
        for (let i = 0; i < 115; i++) {
          const x = Math.floor(random() * 126);
          const y = Math.floor(random() * 126);
          ctx.globalAlpha = .72;
          ctx.fillStyle = random() > .5 ? "#435e45" : "#b0a477";
          ctx.fillRect(x, y, 1, 3);
          ctx.fillRect(x + 1, y - 1, 1, 2);
          if (random() > .6) ctx.fillRect(x - 1, y + 1, 1, 2);
        }
        // Weathered earth and tiny stones.
        for (let i = 0; i < 42; i++) {
          const x = Math.floor(random() * 124);
          const y = Math.floor(random() * 124);
          ctx.globalAlpha = .58;
          ctx.fillStyle = random() > .5 ? "#b2a17a" : "#465a49";
          ctx.fillRect(x, y, 3, 2);
          ctx.fillRect(x + 1, y - 1, 2, 1);
        }
        ctx.globalAlpha = 1;
        texture.refresh();
      }
      const maskSource = this.make.graphics({x:0,y:0,add:false});
      maskSource.fillStyle(0xffffff, 1);
      maskSource.fillPoints(points, true);
      const mask = maskSource.createGeometryMask();
      this.groundMaskSource = maskSource;
      this.groundTile = this.add.tileSprite(900, 550, WORLD_W, WORLD_H, "muse-ground")
        .setOrigin(.5).setDepth(1).setMask(mask);
    }

    drawCoast(points) {
      const coast = this.add.graphics().setDepth(5);
      coast.lineStyle(48, 0xb29b70, .92);
      coast.strokePoints(points, true);
      coast.lineStyle(30, 0x8f8b62, .96);
      coast.strokePoints(points, true);
      coast.lineStyle(5, 0xd1c18d, .5);
      coast.strokePoints(points, true);
      coast.lineStyle(3, 0x293f3b, .8);
      coast.strokePoints(points, true);
      coast.destroy();
    }

    createCoastGlints(points) {
      let index = 0;
      for (let edge = 0; edge < points.length; edge++) {
        const a = points[edge];
        const b = points[(edge + 1) % points.length];
        const length = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        const steps = Math.max(1, Math.floor(length / 45));
        for (let step = 0; step < steps; step++) {
          if (index++ % 2) continue;
          const t = step / steps;
          const x = Phaser.Math.Linear(a.x, b.x, t);
          const y = Phaser.Math.Linear(a.y, b.y, t);
          const angle = Math.atan2(y - 550, x - 850);
          const glint = this.add.rectangle(
            x + Math.cos(angle) * 29,
            y + Math.sin(angle) * 29,
            Phaser.Math.Between(5, 12), 2, 0xd4d6b5, .22
          ).setRotation(angle).setDepth(6);
          this.tweens.add({
            targets: glint, alpha: {from:.08,to:.52}, scaleX:{from:.65,to:1.4},
            duration: Phaser.Math.Between(1700,3200), yoyo:true, repeat:-1,
            delay: Phaser.Math.Between(0,1800), ease:"Sine.easeInOut"
          });
        }
      }
    }

    drawPath() {
      const g = this.add.graphics().setDepth(4);
      const path = new Phaser.Curves.Path(430, 730);
      path.lineTo(520, 675).lineTo(610, 620).lineTo(700, 590).lineTo(790, 540).lineTo(900, 500).lineTo(1010, 450).lineTo(1110, 410);
      g.lineStyle(34, 0x6b654f, 0.65);
      path.draw(g);
      g.lineStyle(20, 0xb5a47b, 0.78);
      path.draw(g);
      g.lineStyle(2, 0xd2bd8e, 0.22);
      path.draw(g);
      g.destroy();
    }

    drawWorldDetails() {
      // Ancient stone fragments around the old path.
      for (let i = 0; i < 16; i++) {
        const x = 490 + i * 38 + (i % 3) * 7;
        const y = 682 - i * 17 + Math.sin(i) * 12;
        const stone = this.add.rectangle(x, y, 13, 5, i % 2 ? 0x9b9679 : 0x777b67, 0.8).setRotation(-0.18);
        stone.setDepth(y);
      }

      this.add.ellipse(1050, 405, 210, 62, 0x283c32, 0.3).setDepth(400);
      const hut = this.add.container(1050, 365);
      const shadow = this.add.ellipse(0, 43, 180, 36, 0x1b2925, 0.35);
      const base = this.add.rectangle(0, 0, 112, 72, 0xb3a17b).setStrokeStyle(3, 0x544c3a);
      const roof = this.add.triangle(0, -42, -75, 18, 75, 18, 0, -40, 0x4a4036).setStrokeStyle(3, 0x302e29);
      const door = this.add.rectangle(0, 18, 19, 34, 0x41382d);
      const window = this.add.rectangle(32, -4, 17, 16, 0xd3bd81).setStrokeStyle(3, 0x625a43);
      const glow = this.add.rectangle(32, -4, 10, 9, 0xf2d49a, 0.8);
      hut.add([shadow, base, roof, door, window, glow]).setDepth(365);
      this.add.text(1050, 430, "THE OLD WAYFARER", {fontFamily:"monospace",fontSize:"9px",color:"#d9d2b5",letterSpacing:2}).setOrigin(0.5).setAlpha(0.78).setDepth(500);

      this.createTree(470, 390, 1.15);
      this.createTree(580, 330, 0.9);
      this.createTree(1260, 550, 1.25);
      this.createTree(1180, 690, 0.82);
      this.createTree(760, 780, 1.0);
      this.createTree(390, 620, 0.8);
      this.createTree(1370, 430, 0.9);
      this.createTree(900, 300, 0.72);
      this.createTree(590, 520, 0.72);
      this.createTree(1120, 760, 0.94);

      // Ferns, boulders and driftwood make the shore feel less arranged.
      const fernSpots = [[520,470],[635,360],[850,330],[1215,470],[1310,610],[1080,745],[690,820],[430,700],[980,690],[570,590],[1260,760],[810,420]];
      fernSpots.forEach(([x,y],i)=>this.createFern(x,y,.72+(i%4)*.12));
      const rockSpots = [[350,510],[430,460],[650,285],[735,345],[930,330],[1160,520],[1320,600],[1240,750],[920,820],[560,780],[330,680],[1040,760]];
      rockSpots.forEach(([x,y],i)=>this.createRock(x,y,.72+(i%3)*.16));
      this.createDriftwood(1320, 790, -.24);
      this.createDriftwood(510, 835, .18);
      this.createTidePool(290, 570, .8);
      this.createTidePool(1460, 510, .68);
      this.createAncientMarker(690,455);

      for (let i = 0; i < 34; i++) {
        const x = 340 + (i * 83) % 1060;
        const y = 310 + (i * 137) % 490;
        const dx = (x - 850) / 620, dy = (y - 550) / 320;
        if (dx*dx + dy*dy > 0.8 || (x > 700 && x < 1140 && y > 410 && y < 630)) continue;
        const flower = this.add.container(x, y).setDepth(y);
        flower.add(this.add.rectangle(0, 0, 3, 7, 0x4b6948));
        flower.add(this.add.rectangle(0, -4, 4, 4, [0xd4c7a0,0xc4a5a1,0xe0d8b7][i%3]));
        flower.add(this.add.rectangle(3, -3, 3, 3, 0xd6bd82));
      }

      // A small weathered landing pier.
      const pier = this.add.container(1410, 690);
      for (let i = 0; i < 5; i++) {
        pier.add(this.add.rectangle(i * 18, 0, 16, 7, i % 2 ? 0x6b5742 : 0x8a7252));
      }
      pier.add(this.add.rectangle(36, 15, 4, 25, 0x554b3b));
      pier.setDepth(700);
      this.add.text(1435, 735, "LOW TIDE", {fontFamily:"monospace",fontSize:"8px",color:"#c2c7b4",letterSpacing:2}).setOrigin(0.5).setAlpha(0.7);
    }

    createTree(x, y, scale = 1) {
      if (!this.textures.exists("muse-tree")) {
        const texture = this.textures.createCanvas("muse-tree", 32, 42);
        const ctx = texture.getContext();
        ctx.imageSmoothingEnabled = false;
        // Root shadow and branching trunk.
        ctx.fillStyle = "#3b4032"; ctx.fillRect(13, 22, 7, 18);
        ctx.fillStyle = "#6e573c"; ctx.fillRect(14, 20, 5, 19);
        ctx.fillStyle = "#98734a"; ctx.fillRect(15, 23, 2, 13);
        ctx.fillStyle = "#4b4935"; ctx.fillRect(10, 35, 5, 3); ctx.fillRect(18, 35, 5, 3);
        ctx.fillStyle = "#5e4c36"; ctx.fillRect(10, 17, 5, 9); ctx.fillRect(18, 15, 5, 11);
        const rows = [
          [12,19],[8,23],[5,26],[3,28],[2,29],[1,30],[1,30],[2,29],[3,28],[4,27],
          [5,26],[6,25],[7,24],[9,22],[11,20]
        ];
        const leafPalette = ["#293f34","#344e3c","#405b42","#526b48","#64764e","#7c8659"];
        rows.forEach(([left,right], row) => {
          const y = 3 + row;
          for (let x = left; x <= right; x++) {
            const hash = (x * 17 + y * 31 + (x*y)%13) % 23;
            const shade = hash < 3 ? 5 : hash < 7 ? 4 : hash < 13 ? 3 : hash < 19 ? 2 : 1;
            ctx.fillStyle = leafPalette[shade];
            ctx.fillRect(x, y, 1, 1);
          }
        });
        // Small pixel clusters catch the light.
        [[7,8],[9,6],[20,7],[23,11],[11,14],[18,16],[5,13],[25,16]].forEach(([x,y],i) => {
          ctx.fillStyle = i%2 ? "#87905e" : "#a0a06a";
          ctx.fillRect(x,y,2,1);
          ctx.fillRect(x+1,y-1,1,1);
        });
        // A few darker gaps make the canopy less symmetrical.
        [[8,12],[22,14],[14,8],[17,18],[5,17]].forEach(([x,y]) => {
          ctx.fillStyle = "#263b32"; ctx.fillRect(x,y,2,2);
        });
        texture.refresh();
      }
      const tree = this.add.container(x, y).setScale(scale).setDepth(y);
      tree.add(this.add.ellipse(2, 19, 66, 17, 0x263b31, 0.35));
      const canopy = this.add.image(0, -13, "muse-tree").setOrigin(.5,.5).setScale(2.05);
      tree.add(canopy);
      this.tweens.add({targets:canopy,angle:{from:-1.2,to:1.2},duration:2400 + (x%5)*180,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      return tree;
    }

    createFern(x,y,scale=1) {
      const fern = this.add.container(x,y).setDepth(y).setScale(scale);
      fern.add(this.add.ellipse(0,3,28,8,0x273c30,.28));
      const colors=[0x385b42,0x52734b,0x74865a];
      for(let i=0;i<5;i++){
        const side=i%2?1:-1;
        const stem=this.add.rectangle(side*(3+i*2),-5-i*1.4,2,18-i,0x405e42).setRotation(side*(.28+i*.12));
        fern.add(stem);
        for(let j=0;j<3;j++){
          const leaf=this.add.rectangle(side*(7+i*2+j*2),-9-i*1.3+j*2,7,3,colors[(i+j)%3]).setRotation(side*(.5+j*.18));
          fern.add(leaf);
        }
      }
      this.tweens.add({targets:fern,angle:{from:-1.1,to:1.1},duration:2100+(x%7)*130,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      return fern;
    }

    createRock(x,y,scale=1) {
      const rock=this.add.container(x,y).setDepth(y).setScale(scale);
      rock.add(this.add.ellipse(1,5,34,11,0x26352e,.34));
      const body=this.add.polygon(0,0,[-15,4,-11,-8,-4,-14,8,-12,15,-3,12,7,-4,9],0x6b7464);
      body.setStrokeStyle(2,0x394b40,.9);
      rock.add(body);
      rock.add(this.add.polygon(-2,-5,[-8,1,-4,-8,3,-10,7,-5],0x92937b,.7));
      rock.add(this.add.rectangle(7,-1,3,2,0xb0a88a,.7));
      return rock;
    }

    createDriftwood(x,y,rotation=0) {
      const log=this.add.container(x,y).setDepth(y).setRotation(rotation);
      log.add(this.add.ellipse(0,5,68,13,0x26362e,.3));
      log.add(this.add.rectangle(0,0,58,8,0x6e573d).setStrokeStyle(2,0x493d30));
      log.add(this.add.rectangle(-13,-1,20,2,0xa08056,.75));
      log.add(this.add.ellipse(28,0,9,8,0x9a805c).setStrokeStyle(2,0x493d30));
      for(let i=0;i<4;i++) log.add(this.add.rectangle(-20+i*11,-5,2,2,0x3e4836));
      return log;
    }

    createTidePool(x,y,scale=1) {
      const pool=this.add.container(x,y).setDepth(y-1).setScale(scale);
      pool.add(this.add.ellipse(0,0,82,38,0x263e3d,.5));
      pool.add(this.add.ellipse(0,-2,70,27,0x557b78,.82));
      pool.add(this.add.ellipse(-9,-5,31,7,0xb5c7ae,.2));
      pool.add(this.add.ellipse(15,4,17,5,0x9cbab0,.22));
      const shimmer=this.add.ellipse(-8,-4,22,3,0xe0dfc2,.28);
      pool.add(shimmer);
      this.tweens.add({targets:shimmer,alpha:.05,scaleX:1.8,duration:1900,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      return pool;
    }

    createAncientMarker(x,y) {
      const marker=this.add.container(x,y).setDepth(y);
      marker.add(this.add.ellipse(0,8,48,15,0x26372f,.35));
      marker.add(this.add.rectangle(0,-13,22,40,0x777a67).setStrokeStyle(2,0x454f43));
      marker.add(this.add.rectangle(-2,-18,14,4,0x9b9a7b));
      marker.add(this.add.rectangle(0,-8,3,12,0x4b5c4a));
      marker.add(this.add.rectangle(0,-2,12,2,0x4b5c4a));
      marker.add(this.add.rectangle(0,3,7,2,0x4b5c4a));
      this.tweens.add({targets:marker,alpha:{from:.9,to:1},duration:2600,yoyo:true,repeat:-1});
      return marker;
    }

    createPlayer() {
      const frames = [
        [
          "......HHHH......",".....HHHHHH.....","....HHHHHHHH....","...HHHHHHHHHH...",
          "...HHSSSSSSHH...","..HHSSSSSSSSHH..","..HHSSSESSSSHH..","..HHSSSSSSSSHH..",
          "...HHSSSSSSHH...","....RRRRRRRR....","...RRRRRRRRRR...","...CCCTTTCCC....",
          "..CCCCCTTTCCCC..","..CCCCCttCCCCC..","...CCCTTTCCC....","...CCCTTTCCC....",
          "....PPPPPP......","...PPPPPPPP.....","...PPPP..PPP....","...PPPP..PPP....",
          "....BB....BB....","....BBBBBBBB....","....BB....BB....","................"
        ],
        [
          "......HHHH......",".....HHHHHH.....","....HHHHHHHH....","...HHHHHHHHHH...",
          "...HHSSSSSSHH...","..HHSSSSSSSSHH..","..HHSSSESSSSHH..","..HHSSSSSSSSHH..",
          "...HHSSSSSSHH...","....RRRRRRRR....","...RRRRRRRRRR...","...CCCTTTCCC....",
          "..CCCCCTTTCCCC..","..CCCCCttCCCCC..","...CCCTTTCCC....","...CCCTTTCCC....",
          "....PPPPPP......","...PPPPPPPP.....","...PPP...PPP....","...PPP...PPP....",
          "...BBB...BBB....","...BBBB..BBBB...","....BB....BB....","................"
        ]
      ];
      const colors = {
        H:"#302d2a", h:"#51483a", S:"#d5b995", E:"#332c2a",
        C:"#53665a", c:"#788a70", T:"#c1aa83", t:"#e0c99d",
        P:"#343d3b", B:"#242b2a", R:"#a96f68", r:"#d19a83"
      };
      const texture = this.textures.createCanvas("muse-wanderer", 32, 24);
      const context = texture.getContext();
      context.imageSmoothingEnabled = false;
      frames.forEach((rows, frameIndex) => {
        rows.forEach((row, y) => {
          [...row].forEach((pixel, x) => {
            if (colors[pixel]) {
              context.fillStyle = colors[pixel];
              context.fillRect(frameIndex * 16 + x, y, 1, 1);
            }
          });
        });
      });
      texture.add("idle", 0, 0, 0, 16, 24);
      texture.add("step", 0, 16, 0, 16, 24);
      texture.refresh();
      this.anims.create({
        key:"wanderer-walk",
        frames:[{key:"muse-wanderer",frame:"idle"},{key:"muse-wanderer",frame:"step"}],
        frameRate:7,
        repeat:-1
      });

      this.playerShadow = this.add.ellipse(820, 620, 27, 9, 0x17251e, 0.48).setDepth(619);
      this.player = this.add.sprite(820, 620, "muse-wanderer", "idle");
      this.player.setOrigin(.5, .88).setScale(2.25).setDepth(620);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.player.body.setSize(8, 7).setOffset(4, 16);
      this.player.body.setDrag(900, 900);
      this.player.body.setMaxVelocity(190, 190);
      this.player.setFrame("idle");
    }

    createBirds() {
      if (!this.textures.exists("muse-myna")) {
        const texture=this.textures.createCanvas("muse-myna",32,16);
        const ctx=texture.getContext();
        ctx.imageSmoothingEnabled=false;
        const frames=[
          [
            "................",".....BBBB.......","....BBBBBB......","...BBGGGBBBB....",
            "...BBGBBYYBB....","..BBBBBBBBBB....","...BBBBBBBB.....","....WWWW........",
            ".....WW.........","....FF..FF......","................","................"
          ],
          [
            "................",".....BBBB.......","....BBBBBB......","...BBGGGBBBB....",
            "...BBGBBYYBB....","..BBBBBBBBBB....","...BBBBBBBB.....","...WW...........",
            "..WW............","....FF..FF......","................","................"
          ]
        ];
        const palette={B:"#252a28",G:"#d2ad43",Y:"#d6a34a",W:"#4a5046",F:"#b78b45"};
        frames.forEach((rows,frame)=>{
          rows.forEach((row,y)=>[...row].forEach((pixel,x)=>{
            if(palette[pixel]){ctx.fillStyle=palette[pixel];ctx.fillRect(frame*16+x,y,1,1);}
          }));
        });
        texture.add("glide",0,0,0,16,16);
        texture.add("flap",0,16,0,16,16);
        texture.refresh();
      }
      this.anims.create({
        key:"myna-flight",
        frames:[{key:"muse-myna",frame:"glide"},{key:"muse-myna",frame:"flap"}],
        frameRate:5,
        repeat:-1
      });
      this.birds=[];
      for(let i=0;i<2;i++){
        const x=650+i*300,y=390+i*90;
        const shadow=this.add.ellipse(x,y+12,18,5,0x1c3029,.23).setDepth(y-1);
        const bird=this.add.sprite(x,y,"muse-myna","glide").setScale(1.75).setDepth(y+220);
        bird.setName(i===0?"Mina":"Toto");
        bird.play("myna-flight");
        const phase=i*2;
        this.birds.push({bird,shadow,phase,name:i===0?"Mina":"Toto",previousX:x});
        this.tweens.add({
          targets:bird,x:x+(i?-125:145),y:y+(i?24:-45),
          duration:6900+i*1100,yoyo:true,repeat:-1,ease:"Sine.easeInOut",
          delay:i*900
        });
      }
    }

    createWeather() {
      const date = new Date();
      const month = date.getMonth();
      const daySeed = date.getFullYear() * 372 + month * 31 + date.getDate();
      const season = month <= 1 || month === 11 ? "WINTER" : month <= 4 ? "SPRING" : month <= 7 ? "SUMMER" : "AUTUMN";
      const seasonalTint = {
        WINTER: [0x9bb5cf, .075],
        SPRING: [0x9ab78c, .045],
        SUMMER: [0xe0bd79, .035],
        AUTUMN: [0xc68e5d, .075]
      }[season];
      this.add.rectangle(0, 0, 2400, 1600, seasonalTint[0], seasonalTint[1])
        .setOrigin(0).setScrollFactor(0).setDepth(1900)
        .setBlendMode(Phaser.BlendModes.MULTIPLY);
      const weatherRoll = Math.abs(Math.sin(daySeed * 12.9898) * 43758.5453) % 1;
      const weather = season === "WINTER" ? (weatherRoll > .66 ? "SNOW" : weatherRoll > .37 ? "FOG" : "CLEAR")
        : season === "SPRING" ? (weatherRoll > .72 ? "RAIN" : weatherRoll > .46 ? "FOG" : "CLEAR")
        : season === "SUMMER" ? (weatherRoll > .83 ? "RAIN" : "CLEAR")
        : (weatherRoll > .68 ? "RAIN" : weatherRoll > .35 ? "FOG" : "CLEAR");
      const label = document.getElementById("weather-label");
      if (label) label.textContent = weather.replace("CLEAR", "CLEAR SKIES");
      const seasonLabel = document.getElementById("season-label");
      if (seasonLabel) seasonLabel.textContent = season;

      if (weather === "RAIN" || weather === "SNOW") {
        const count = weather === "RAIN" ? 58 : 34;
        for (let i = 0; i < count; i++) {
          const isSnow = weather === "SNOW";
          const flake = this.add.rectangle(
            Phaser.Math.Between(0, this.scale.width),
            Phaser.Math.Between(-this.scale.height, this.scale.height),
            isSnow ? 3 : 1,
            isSnow ? 3 : 13,
            isSnow ? 0xe4e9df : 0xa8c2c4,
            isSnow ? .68 : .35
          ).setScrollFactor(0).setDepth(2100);
          this.tweens.add({
            targets: flake,
            y: this.scale.height + 20,
            x: flake.x + (isSnow ? Phaser.Math.Between(-32, 32) : 12),
            duration: isSnow ? Phaser.Math.Between(4200, 7600) : Phaser.Math.Between(650, 1150),
            repeat: -1,
            onRepeat: () => {
              flake.y = -20;
              flake.x = Phaser.Math.Between(0, this.scale.width);
            }
          });
        }
      }
      if (weather === "FOG") {
        for (let i = 0; i < 4; i++) {
          const mist = this.add.ellipse(
            this.scale.width * (0.2 + i * .22),
            this.scale.height * (.35 + (i % 2) * .3),
            this.scale.width * .62,
            42 + i * 12,
            0xd5ded2,
            .035
          ).setScrollFactor(0).setDepth(1800);
          this.tweens.add({ targets: mist, x: mist.x + 55, alpha: .075, duration: 8500 + i * 1700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
      }
      if (season === "AUTUMN") {
        for (let i = 0; i < 9; i++) {
          const leaf = this.add.rectangle(
            Phaser.Math.Between(0, this.scale.width),
            Phaser.Math.Between(0, this.scale.height),
            4, 3, [0xb77d50,0x9e6845,0xc49a62][i % 3], .72
          ).setScrollFactor(0).setDepth(2050);
          this.tweens.add({
            targets: leaf, y: this.scale.height + 15, x: leaf.x + Phaser.Math.Between(-65,65),
            angle: 180, duration: Phaser.Math.Between(5200,9000), repeat: -1,
            onRepeat: () => { leaf.y = -10; leaf.x = Phaser.Math.Between(0,this.scale.width); }
          });
        }
      }
    }

    createAtmosphere() {
      this.fireflies = [];
      for (let i = 0; i < 22; i++) {
        const x = 350 + (i * 61) % 1050;
        const y = 300 + (i * 89) % 480;
        const mote = this.add.rectangle(x, y, 2, 2, 0xe6d49a, 0.0).setDepth(950);
        this.fireflies.push(mote);
        this.tweens.add({targets:mote,y:y-12,duration:1900+(i%5)*360,yoyo:true,repeat:-1,delay:i*95,ease:"Sine.easeInOut"});
      }
      this.shade = this.add.rectangle(0, 0, 2400, 1600, 0x10172c, 0).setOrigin(0).setScrollFactor(0).setDepth(2000);
      this.shade.setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    updateLighting() {
      const now=new Date();
      const hour=now.getHours()+now.getMinutes()/60;
      const daylight=Phaser.Math.Clamp((Math.cos((hour-12)*Math.PI/12)+1)/2,0,1);
      const nightFactor=1-daylight;
      const alpha=.34*nightFactor;
      if(this.lightingTween)this.lightingTween.stop();
      this.lightingTween=this.tweens.add({targets:this.shade,alpha,duration:5200,ease:"Sine.easeInOut"});
      const tint=hour<7||hour>18?0x27354b:hour<9||hour>16?0x8b7558:0x10172c;
      this.shade.setFillStyle(tint,1);
      this.fireflies?.forEach((mote,i)=>{
        this.tweens.add({
          targets:mote,alpha:.025+nightFactor*(.22+(i%4)*.07),
          duration:4800+(i%5)*500,ease:"Sine.easeInOut"
        });
      });
    }

    createInteractionPrompt() {
      this.interactionPrompt=this.add.text(this.scale.width/2,66,"A LANDMARK IS NEARBY",{
        fontFamily:"monospace",fontSize:"9px",color:"#e8dfc3",
        backgroundColor:"#172521d9",padding:{x:12,y:8},letterSpacing:1
      }).setOrigin(.5).setScrollFactor(0).setDepth(2200).setAlpha(0);
      this.scale.on("resize",size=>this.interactionPrompt?.setPosition(size.width/2,66));
      this.showingInteractionPrompt=false;
    }


    startBuilding(type) {
      if (!["tree","lantern","flowers","stone"].includes(type)) return;
      this.buildMode = type;
      this.touchDirections.clear();
      window.dispatchEvent(new CustomEvent("muse:toast",{detail:"PLACE "+type.toUpperCase()+" · TAP AN OPEN PATCH OF LAND"}));
    }

    cancelBuilding() {
      this.buildMode = null;
      window.dispatchEvent(new CustomEvent("muse:builder-mode",{detail:{active:false}}));
    }

    handleBuildPointer(pointer) {
      if (!this.buildMode || !this.landPolygon) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (!Phaser.Geom.Polygon.Contains(this.landPolygon, point.x, point.y)) {
        window.dispatchEvent(new CustomEvent("muse:toast",{detail:"CHOOSE A SPOT ON THE ISLAND"}));
        return;
      }
      const item = {id:"prop-"+Date.now()+"-"+Math.floor(Math.random()*10000),type:this.buildMode,x:Math.round(point.x),y:Math.round(point.y)};
      const objects = this.readPlacedObjects();
      objects.push(item);
      try { localStorage.setItem("muse.world.objects.v1",JSON.stringify(objects)); }
      catch { window.dispatchEvent(new CustomEvent("muse:toast",{detail:"WORLD STORAGE IS FULL"})); return; }
      this.drawPlacedObject(item);
      window.dispatchEvent(new CustomEvent("muse:object-placed",{detail:{type:item.type,count:objects.length}}));
    }

    readPlacedObjects() {
      try {
        const value=JSON.parse(localStorage.getItem("muse.world.objects.v1")||"[]");
        return Array.isArray(value)?value.filter(item=>item&&["tree","lantern","flowers","stone"].includes(item.type)&&Number.isFinite(item.x)&&Number.isFinite(item.y)): [];
      } catch { return []; }
    }

    loadPlacedObjects() {
      this.placedObjects=[];
      this.readPlacedObjects().forEach(item=>this.drawPlacedObject(item));
    }

    drawPlacedObject(item) {
      const {x,y,type}=item;
      const g=this.add.graphics().setDepth(y+2);
      if(type==="tree"){
        g.fillStyle(0x263b30,.34);g.fillEllipse(x,y+12,40,13);
        g.fillStyle(0x594b39,1);g.fillRect(x-3,y-13,6,22);
        g.fillStyle(0x344b39,1);g.fillRect(x-15,y-31,30,20);
        g.fillStyle(0x506b48,1);g.fillRect(x-19,y-27,38,13);
        g.fillStyle(0x819066,1);g.fillRect(x-10,y-35,17,8);
        g.fillStyle(0xa2a477,.8);g.fillRect(x-7,y-32,5,3);
      } else if(type==="lantern"){
        g.fillStyle(0x26352d,.35);g.fillEllipse(x,y+9,19,7);
        g.fillStyle(0x4b4030,1);g.fillRect(x-2,y-17,4,25);
        g.fillStyle(0x756447,1);g.fillRect(x-6,y-23,12,9);
        g.fillStyle(0xe7c98c,.9);g.fillRect(x-3,y-21,6,5);
        g.fillStyle(0xe9c98b,.12);g.fillCircle(x,y-18,17);
      } else if(type==="flowers"){
        g.fillStyle(0x36513d,.8);g.fillRect(x-1,y-9,2,11);g.fillRect(x+5,y-6,2,8);
        [[x-5,y-11,0xd6b9a0],[x+1,y-15,0xe0cf9a],[x+8,y-9,0xb7a6c6],[x+1,y-6,0xe5d9c1]].forEach(([fx,fy,color])=>{g.fillStyle(color,1);g.fillRect(fx,fy,4,4);});
      } else {
        g.fillStyle(0x283b34,.35);g.fillEllipse(x,y+5,25,9);
        g.fillStyle(0x777b69,1);g.fillRect(x-9,y-7,18,10);
        g.fillStyle(0xa4a18a,1);g.fillRect(x-6,y-10,11,4);
        g.fillStyle(0x505f50,1);g.fillRect(x-7,y+3,14,2);
      }
      g.setData("museObjectId",item.id);
      if(type==="lantern"){
        const glow=this.add.circle(x,y-18,23,0xe8c88b,.06).setDepth(y+1);
        this.tweens.add({targets:glow,alpha:{from:.03,to:.14},scale:{from:.85,to:1.18},duration:1800,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      }
      if(type==="tree") {
        const sway=this.add.rectangle(x,y-25,1,1,0xffffff,0).setDepth(y+3);
        this.tweens.add({targets:g,angle:{from:-1,to:1},duration:2600,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
        sway.destroy();
      }
      return g;
    }

    getNearbyDiscovery() {
      const discoveries=[
        {id:"wayfarer",title:"THE OLD WAYFARER",x:1050,y:365,r:145,description:"A small house with a light left on. Someone once lived here.",lore:"The door is weathered, but the lamp in the eastern window still glows. A shelf inside holds four empty cups and a map with its edges carefully folded. Whoever lived here expected company — and never quite stopped waiting.\n\nA note is pinned beneath the map: “If you have found this place, the shore has not forgotten how to welcome strangers.”"},
        {id:"marker",title:"THE WEATHERED MARKER",x:690,y:455,r:92,description:"Its symbols have almost disappeared beneath the moss.",lore:"The stone is older than the path that passes it. Beneath the moss, its carved marks form a pattern of tides, stars and tiny branching lines. It does not point north. It points somewhere that no longer appears on any chart.\n\nOne symbol has been polished smooth by countless fingertips."},
        {id:"low-tide",title:"LOW TIDE",x:1380,y:665,r:110,description:"The sea has left tiny shells and glass-smooth stones along the pier.",lore:"At the far end of the pier, the water withdraws just long enough to reveal a narrow ribbon of dark sand. There are pale shells, green glass and a little brass button worn almost flat.\n\nThe tide will cover the shore again. For now, the sea has left a small collection of things it could not keep."},
        {id:"quiet-grove",title:"THE QUIET GROVE",x:760,y:780,r:95,description:"The leaves move even when the air feels still.",lore:"The trees grow close together here, their roots threading through the same patch of earth. The air is cooler beneath their canopy. If you stay still, you may notice that the leaves move in a slow rhythm — not with the wind, but as if the grove is breathing.\n\nA single feather rests beside the oldest root. Mina and Toto sometimes circle this place before flying out over the water."}
      ];
      return discoveries
        .map(item=>({...item,distance:Phaser.Math.Distance.Between(this.player.x,this.player.y,item.x,item.y)}))
        .filter(item=>item.distance<item.r)
        .sort((a,b)=>a.distance-b.distance)[0] || null;
    }

    inspectNearby() {
      const nearby=this.getNearbyDiscovery();
      if(nearby){
        window.dispatchEvent(new CustomEvent("muse:discovery",{detail:{id:nearby.id,title:nearby.title,description:nearby.description,lore:nearby.lore}}));
      }else{
        window.dispatchEvent(new CustomEvent("muse:toast",{detail:"Only wind, grass and the sound of the sea."}));
      }
    }

    update() {
      if (!this.player?.body) return;
      const keys = this.keys;
      const left = keys.A.isDown || keys.LEFT.isDown || this.touchDirections.has("left");
      const right = keys.D.isDown || keys.RIGHT.isDown || this.touchDirections.has("right");
      const up = keys.W.isDown || keys.UP.isDown || this.touchDirections.has("up");
      const down = keys.S.isDown || keys.DOWN.isDown || this.touchDirections.has("down");
      const speed = keys.SHIFT.isDown ? 180 : 125;
      let vx = (right ? 1 : 0) - (left ? 1 : 0);
      let vy = (down ? 1 : 0) - (up ? 1 : 0);
      if (vx && vy) { vx *= 0.707; vy *= 0.707; }
      const nextX = this.player.x + vx * speed * (this.game.loop.delta / 1000);
      const nextY = this.player.y + vy * speed * (this.game.loop.delta / 1000);
      if (!Phaser.Geom.Polygon.Contains(this.landPolygon, nextX, nextY)) {
        vx = 0;
        vy = 0;
      }
      this.player.body.setVelocity(vx * speed, vy * speed);
      this.player.setDepth(this.player.y);
      this.playerShadow.setPosition(this.player.x, this.player.y + 13).setDepth(this.player.y - 1);
      if (vx < 0) this.player.setFlipX(true);
      else if (vx > 0) this.player.setFlipX(false);
      if (vx || vy) {
        if (!this.player.anims.isPlaying) this.player.anims.play("wanderer-walk");
      } else if (this.player.anims.isPlaying) {
        this.player.anims.stop();
        this.player.setFrame("idle");
      }
      if (this.time.now > (this.nextMapUpdate || 0)) {
        this.nextMapUpdate = this.time.now + 250;
        window.dispatchEvent(new CustomEvent("muse:position", {detail:{x:this.player.x,y:this.player.y}}));
      }
      const nearby=this.getNearbyDiscovery();
      if(Boolean(nearby)!==this.showingInteractionPrompt){
        this.showingInteractionPrompt=Boolean(nearby);
        this.tweens.add({targets:this.interactionPrompt,alpha:nearby?1:0,duration:220,ease:"Sine.easeOut"});
      }
      if(nearby && this.interactionPrompt.text!==nearby.title+"  ·  INTERACT"){
        this.interactionPrompt.setText(nearby.title+"  ·  INTERACT");
      }else if(!nearby && this.interactionPrompt.text!=="A LANDMARK IS NEARBY"){
        this.interactionPrompt.setText("A LANDMARK IS NEARBY");
      }
      if (Phaser.Input.Keyboard.JustDown(keys.E)) this.inspectNearby();
      this.birds.forEach(({bird,shadow,previousX},i)=>{
        bird.setDepth(bird.y+220);
        bird.setFlipX(bird.x<previousX);
        shadow.setPosition(bird.x,bird.y+12).setDepth(bird.y-1);
        this.birds[i].previousX=bird.x;
      });
    }
  }

  const config = {
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#18343a",
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    physics: { default: "arcade", arcade: { debug: false } },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [FirstShore]
  };
  return new Phaser.Game(config);
}
