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
      this.drawDistantIsles();
      this.drawIsland();
      this.drawWorldDetails();
      this.createAmbientLife();
      this.createPlayer();
      this.createBirds();
      this.createAtmosphere();
      this.createCinematicLighting();
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
      this.game.events.on("builder:edit", this.startEditing, this);
      this.game.events.on("builder:delete", this.deleteSelectedObject, this);
      this.game.events.on("builder:transform", this.transformSelectedObject, this);
      this.loadPlacedObjects();
      this.input.on("pointerdown", this.handleBuildPointer, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.game.events.off("touch-move", this.onTouchMove, this);
        this.game.events.off("interact", this.inspectNearby, this);
        this.game.events.off("builder:start", this.startBuilding, this);
        this.game.events.off("builder:cancel", this.cancelBuilding, this);
        this.game.events.off("builder:edit", this.startEditing, this);
        this.game.events.off("builder:delete", this.deleteSelectedObject, this);
        this.game.events.off("builder:transform", this.transformSelectedObject, this);
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

    drawDistantIsles() {
      // Distant landforms sit beneath the playable shore, giving the sea a horizon.
      const far=this.add.graphics().setDepth(-4);
      const islands=[
        {x:145,y:205,s:1.0},{x:590,y:105,s:.72},{x:1120,y:120,s:.9},
        {x:1570,y:235,s:1.12},{x:1660,y:830,s:.68},{x:90,y:860,s:.8}
      ];
      islands.forEach((item,i)=>{
        const {x,y,s}=item;
        far.fillStyle(0x081b21,.34);far.fillEllipse(x+7*s,y+10*s,190*s,38*s);
        far.fillStyle(i%2?0x29443e:0x314b43,.72);
        far.fillPoints([
          new Phaser.Geom.Point(x-88*s,y+4*s),new Phaser.Geom.Point(x-62*s,y-9*s),
          new Phaser.Geom.Point(x-36*s,y-8*s),new Phaser.Geom.Point(x-12*s,y-25*s),
          new Phaser.Geom.Point(x+12*s,y-17*s),new Phaser.Geom.Point(x+39*s,y-22*s),
          new Phaser.Geom.Point(x+66*s,y-5*s),new Phaser.Geom.Point(x+91*s,y+5*s)
        ],true);
        far.fillStyle(0x52614a,.55);
        far.fillTriangle(x-25*s,y-14*s,x-12*s,y-36*s,x+2*s,y-15*s);
        far.fillTriangle(x+19*s,y-15*s,x+34*s,y-32*s,x+48*s,y-10*s);
        // Tiny tree crowns read as silhouettes, not repeated detailed props.
        for(let t=0;t<4;t++){
          const tx=x+(-48+t*29)*s,ty=y-18*s-(t%2)*5*s;
          far.fillStyle(0x1b3831,.72);
          far.fillTriangle(tx-8*s,ty+8*s,tx,ty-13*s,tx+8*s,ty+8*s);
        }
      });
      far.destroy();

      const haze=this.add.graphics().setDepth(-2);
      haze.fillStyle(0x9aafa0,.035);
      haze.fillEllipse(900,160,1800,105);
      haze.fillStyle(0x78958b,.025);
      haze.fillEllipse(760,930,1600,85);
      haze.destroy();
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
      const g=this.add.graphics().setDepth(4);
      const paths=[
        new Phaser.Curves.Path(430,730).lineTo(520,675).lineTo(610,620).lineTo(700,590).lineTo(790,540).lineTo(900,500).lineTo(1010,450).lineTo(1110,410),
        new Phaser.Curves.Path(790,540).lineTo(760,470).lineTo(790,405).lineTo(850,350),
        new Phaser.Curves.Path(700,590).lineTo(625,650).lineTo(590,730).lineTo(620,795),
        new Phaser.Curves.Path(1010,450).lineTo(1110,505).lineTo(1200,565).lineTo(1285,635)
      ];
      paths.forEach((path,i)=>{
        g.lineStyle(i===0?36:23,0x514e3d,.48);path.draw(g);
        g.lineStyle(i===0?23:13,0xb5a47b,.76);path.draw(g);
        g.lineStyle(2,0xe0cca0,.24);path.draw(g);
      });
      const stones=[[470,704],[510,681],[556,653],[602,628],[650,609],[700,588],[750,565],[804,535],[858,516],[912,493],[965,469],[1018,447],[1068,427],[1110,410],[780,457],[793,414],[832,370],[628,679],[602,727],[608,770],[1095,493],[1160,532],[1215,575],[1260,617]];
      stones.forEach(([x,y],i)=>{
        const width=Phaser.Math.Between(8,14),height=Phaser.Math.Between(4,7);
        this.add.rectangle(x+(i%3-1)*3,y+(i%2)*2,width,height,i%3===0?0xaaa080:0x77745d,.34).setRotation((i%4-1.5)*.09).setDepth(4.2);
        this.add.rectangle(x,y-1,width*.55,1,0xd4c49a,.18).setDepth(4.3);
      });
      g.destroy();
    }

    drawBiomeDetails() {
      // Fern Hollow: layered canopy shadows, mature trees and dense understory.
      const grove=this.add.graphics().setDepth(7);
      [[410,390,180,92],[490,430,210,112],[565,365,145,80],[690,790,190,86]].forEach(([x,y,w,h],i)=>{
        grove.fillStyle(i%2?0x425d43:0x263d31,.12);grove.fillEllipse(x,y,w,h);
        grove.fillStyle(0x829064,.07);grove.fillEllipse(x-8,y-7,w*.62,h*.56);
      });
      grove.destroy();
      [[420,365,1.15],[500,410,.94],[555,350,.82],[640,390,.72],[700,770,.86],[735,815,.74],[820,330,.68]].forEach(([x,y,s])=>this.createTree(x,y,s));
      [[440,455],[475,470],[530,455],[590,420],[650,430],[690,820],[745,845],[790,810],[825,365],[860,390]].forEach(([x,y],i)=>this.createFern(x,y,.72+(i%4)*.13));

      // Wildflower meadow: hand-scattered pixel clusters with varied petal tones.
      const meadow=this.add.graphics().setDepth(8);
      const patches=[[930,700,110,48],[1010,745,95,42],[880,760,80,36],[1180,350,72,35],[1240,390,88,42]];
      const petals=[0xd8c7a0,0xc99fa0,0xe2d7b4,0xb5b6a0,0xd1b17c];
      patches.forEach(([cx,cy,rx,ry],p)=>{
        for(let i=0;i<78;i++){
          const angle=i*2.399963,radius=Math.sqrt((i+.5)/78);
          const x=Math.round(cx+Math.cos(angle)*rx*radius),y=Math.round(cy+Math.sin(angle)*ry*radius);
          meadow.fillStyle(i%3?0x456343:0x718253,.78);meadow.fillRect(x,y+2,1,3);
          meadow.fillStyle(petals[(i+p)%petals.length],.72+(i%3)*.09);meadow.fillRect(x-1,y+(i%4)-1,3,2);
          meadow.fillStyle(0xe5d5a1,.85);meadow.fillRect(x,y-2,1,1);
          if(i%5===0){meadow.fillStyle(0xeee0bd,.55);meadow.fillRect(x+3,y+2,2,1);}
        }
      });
      meadow.destroy();

      // Saltstone Cove: layered weathered boulders, pools and reed details.
      [[330,555,.92],[365,590,.72],[1400,555,1.08],[1350,600,.8],[1430,640,.68],[1260,785,.78]].forEach(([x,y,s])=>this.createRock(x,y,s));
      [[310,590,.58],[1450,560,.52],[1370,655,.46]].forEach(([x,y,s])=>this.createTidePool(x,y,s));
      const reeds=this.add.graphics().setDepth(9);
      [[300,625],[320,640],[1385,690],[1410,705],[1330,720]].forEach(([x,y],i)=>{
        reeds.fillStyle(0x3d5a43,.85);reeds.fillRect(x,y-8,2,10);
        reeds.fillStyle(i%2?0x8b9a68:0x6f8157,.9);reeds.fillRect(x-2,y-13,2,5);reeds.fillRect(x+2,y-16,2,6);
      });
      reeds.destroy();

      // Pebble seams, tiny mushrooms and lichen flecks.
      const accents=this.add.graphics().setDepth(10);
      [[555,485],[575,490],[595,483],[1080,790],[1100,796],[1120,788],[845,825],[865,830]].forEach(([x,y],i)=>{
        accents.fillStyle(i%2?0x4e5946:0x77755e,.55);accents.fillRect(x,y,3,2);
        accents.fillStyle(0xb3a889,.35);accents.fillRect(x+1,y-1,2,1);
      });
      [[680,455],[705,470],[1115,735],[1140,720]].forEach(([x,y],i)=>{
        accents.fillStyle(0x6e8060,.9);accents.fillRect(x,y,2,5);
        accents.fillStyle(i%2?0xd4c6aa:0xb7a4a0,.9);accents.fillRect(x-2,y-2,5,3);
        accents.fillStyle(0xe5d7bc,.8);accents.fillRect(x-1,y-3,2,1);
      });
      accents.destroy();
    }

    drawWorldDetails() {
      // Ancient stone fragments around the old path.
      for (let i = 0; i < 16; i++) {
        const x = 490 + i * 38 + (i % 3) * 7;
        const y = 682 - i * 17 + Math.sin(i) * 12;
        const stone = this.add.rectangle(x, y, 13, 5, i % 2 ? 0x9b9679 : 0x777b67, 0.8).setRotation(-0.18);
        stone.setDepth(y);
      }

      this.createWayfarerHut(1050,365);
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
      this.createRuinedArch(835,350);
      this.createBrokenSeaWall(1285,500);

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

      this.createWeatheredPier(1410,690);
      this.add.text(1435, 735, "LOW TIDE", {fontFamily:"monospace",fontSize:"8px",color:"#c2c7b4",letterSpacing:2}).setOrigin(0.5).setAlpha(0.7);
      this.drawBiomeDetails();
    }

    createWayfarerHut(x,y) {
      // A small timber-and-stone building with individually placed, weathered
      // pieces so its silhouette reads clearly at the game's native pixel scale.
      this.add.ellipse(x,y+43,190,42,0x172721,.38).setDepth(y+1);
      const hut=this.add.container(x,y).setDepth(y+5);
      const add=(child)=>hut.add(child);
      add(this.add.rectangle(0,25,126,16,0x514b3a));
      add(this.add.rectangle(0,18,116,29,0x958b6a).setStrokeStyle(2,0x4e4939));
      add(this.add.rectangle(0,5,112,25,0xb0a17e).setStrokeStyle(2,0x655b45));
      // Individual masonry courses and chipped corners.
      for(let row=0;row<3;row++){
        for(let col=0;col<6;col++){
          const bx=-49+col*19+(row%2?8:0),by=11+row*9;
          add(this.add.rectangle(bx,by,15,5,[0x9b9070,0x827c61,0xb2a17b][(row+col)%3],.9)
            .setStrokeStyle(1,0x70664e,.55));
        }
      }
      // Dark timber frame, lintels and uneven planks.
      add(this.add.rectangle(-54,-3,7,47,0x594632));
      add(this.add.rectangle(54,-3,7,47,0x594632));
      add(this.add.rectangle(0,-17,119,8,0x493d30));
      add(this.add.rectangle(-24,-5,3,35,0x72583d));
      add(this.add.rectangle(25,-4,3,34,0x72583d));
      // Layered thatch roof with a broken, asymmetrical ridge.
      add(this.add.triangle(0,-39,-73,24,74,24,5,-25,0x3e4034).setStrokeStyle(3,0x292f29));
      add(this.add.triangle(-2,-43,-63,20,62,20,0,-23,0x66563d));
      for(let i=0;i<9;i++){
        const px=-55+i*14;
        add(this.add.rectangle(px,-42+(i%3)*2,12,3,i%2?0x89734e:0x756344));
        add(this.add.rectangle(px+3,-38+(i%2)*2,8,2,0x4d4a35));
      }
      add(this.add.rectangle(-1,-63,36,5,0x594b37));
      add(this.add.rectangle(4,-67,23,4,0x777052));
      // Recessed doorway and a small warm window.
      add(this.add.rectangle(-17,13,23,38,0x342f29));
      add(this.add.rectangle(-17,15,15,34,0x594332));
      add(this.add.rectangle(-21,15,2,29,0x8a6945));
      add(this.add.circle(-10,16,1.8,0xd7b77b));
      add(this.add.rectangle(34,-1,23,23,0x3e4037).setStrokeStyle(2,0x574a37));
      add(this.add.rectangle(34,-1,14,15,0xe4c88d,.82));
      add(this.add.rectangle(34,-1,2,18,0x6c5940));
      add(this.add.rectangle(34,-1,18,2,0x6c5940));
      // Moss, ivy and rain stains break the clean geometry.
      for(let i=0;i<8;i++){
        const ix=-53+(i*17)%105,iy=-12+(i*13)%35;
        add(this.add.rectangle(ix,iy,3,2,i%2?0x536b49:0x71805a,.9));
      }
      add(this.add.rectangle(-58,18,5,12,0x526b4b));
      add(this.add.rectangle(-62,25,4,8,0x61764e));
      add(this.add.rectangle(58,23,3,8,0x526b4b));
      add(this.add.rectangle(-40,-18,2,9,0x3d4b3a,.8));
      add(this.add.rectangle(46,-16,2,7,0x3d4b3a,.8));
      // A short stone step and a path of worn flagstones.
      add(this.add.rectangle(-17,39,37,6,0x77745e));
      add(this.add.rectangle(-17,36,31,3,0xa49a79));
      for(let i=0;i<4;i++){
        const stone=this.add.rectangle(4+i*15,43+(i%2)*3,12,4,i%2?0x77745e:0x9b9070,.82);
        stone.setRotation(-.06);
        this.add(stone);
      }
      this.tweens.add({targets:hut,y:y-1,duration:4200,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      return hut;
    }

    createRuinedArch(x,y) {
      const ruin=this.add.container(x,y).setDepth(y+4);
      ruin.add(this.add.ellipse(0,29,150,24,0x1c2c25,.34));
      // Two battered piers and a fractured lintel, deliberately incomplete.
      const stones=[
        [-37,10,18,19,0x777966],[-37,-7,21,17,0x8b8b72],[-34,-23,17,15,0x696f5f],
        [37,11,20,18,0x737967],[39,-6,18,17,0x8e8d73],[35,-22,21,15,0x646c5b],
        [-13,-34,22,12,0x777966],[8,-37,24,11,0x8d8b70],[27,-34,18,10,0x666d5c]
      ];
      stones.forEach(([sx,sy,w,h,c],i)=>{
        const block=this.add.rectangle(sx,sy,w,h,c).setStrokeStyle(2,0x414b40,.9);
        block.setRotation((i%3-1)*.035);ruin.add(block);
        ruin.add(this.add.rectangle(sx-w*.18,sy-h*.25,w*.28,2,0xb0a889,.42));
      });
      // Missing masonry and fractures expose the broken silhouette.
      ruin.add(this.add.rectangle(-7,-29,9,5,0x3c493d));
      ruin.add(this.add.rectangle(22,-42,8,5,0x3c493d));
      [[-43,-12],[-31,-25],[34,-14],[43,-30]].forEach(([sx,sy],i)=>{
        ruin.add(this.add.rectangle(sx,sy,3,7,i%2?0x4c6047:0x687b50).setRotation(.3));
      });
      ruin.add(this.add.rectangle(0,18,112,5,0x4b5747,.42));
      this.add.text(x,y+43,"THE OLD STONE GATE",{
        fontFamily:"monospace",fontSize:"7px",color:"#c3c0a5",letterSpacing:1
      }).setOrigin(.5).setAlpha(.55).setDepth(y+60);
      return ruin;
    }

    createBrokenSeaWall(x,y) {
      const wall=this.add.container(x,y).setDepth(y+3);
      wall.add(this.add.ellipse(0,12,210,25,0x1b2b25,.3));
      const courses=[
        {y:0,count:8,height:12,colors:[0x737765,0x85836b,0x626e60]},
        {y:-12,count:7,height:11,colors:[0x88866e,0x707764,0x989176]}
      ];
      courses.forEach((course,row)=>{
        for(let i=0;i<course.count;i++){
          const bx=-82+i*23+(row?10:0);
          if((row===1&&i===5)||(row===0&&i===7))continue;
          const block=this.add.rectangle(bx,course.y,21,course.height,course.colors[(i+row)%3])
            .setStrokeStyle(1,0x465246,.8);
          block.setRotation((i%3-1)*.025);wall.add(block);
          wall.add(this.add.rectangle(bx-4,course.y-3,7,2,0xb0a889,.28));
        }
      });
      // Salt-darkened coping stones and small tufts growing in the joints.
      for(let i=0;i<6;i++){
        wall.add(this.add.rectangle(-70+i*27,-20,24,5,i%2?0x5e6759:0x777765));
      }
      [[-50,-18],[5,-17],[57,-15]].forEach(([sx,sy],i)=>{
        wall.add(this.add.rectangle(sx,sy-5,2,8,0x526c4d));
        wall.add(this.add.rectangle(sx+(i%2?3:-3),sy-8,3,3,0x78865a));
      });
      return wall;
    }

    createWeatheredPier(x,y) {
      const pier=this.add.container(x,y).setDepth(y+5);
      pier.add(this.add.ellipse(37,20,125,24,0x1b2b25,.35));
      // Cross-braced support posts descend into the tidal water.
      for(let i=0;i<5;i++){
        const px=i*18;
        pier.add(this.add.rectangle(px,15,5,34,0x493f31));
        pier.add(this.add.rectangle(px-1,7,8,4,0x927653));
        pier.add(this.add.rectangle(px+2,18,2,20,0x806348,.7));
      }
      // Uneven planks, grain marks and iron nails.
      for(let i=0;i<6;i++){
        const px=-7+i*15;
        pier.add(this.add.rectangle(px,-1,14,8,i%2?0x70583f:0x947653).setStrokeStyle(1,0x493d30,.8));
        pier.add(this.add.rectangle(px-3,-2,5,1,0xb99a6a,.6));
        pier.add(this.add.circle(px+4,-2,1,0x332f2a));
      }
      pier.add(this.add.rectangle(37,-7,7,5,0x594832));
      pier.add(this.add.rectangle(72,4,13,5,0x67513a).setRotation(-.18));
      // A short mooring rope and a hanging fragment of net.
      pier.add(this.add.rectangle(73,13,2,15,0x9b8660).setRotation(-.12));
      for(let i=0;i<4;i++)pier.add(this.add.rectangle(67+i*4,22,1,9,0x887b5b,.65));
      return pier;
    }

    createAmbientLife() {
      // Fireflies drift beneath Fern Hollow's canopy. Each glow is built from
      // crisp pixel-sized shapes rather than a blurred raster effect.
      const fireflyPoints = [[455,430],[520,455],[585,395],[650,425],[710,790],[770,835],[825,385]];
      fireflyPoints.forEach(([x,y],i) => {
        const glow = this.add.container(x,y).setDepth(y+2);
        glow.add(this.add.rectangle(0,0,9,9,0xd5d89a,.09));
        glow.add(this.add.rectangle(0,0,5,5,0xd5d89a,.16));
        glow.add(this.add.rectangle(0,0,2,2,0xf2e8ae,.95));
        this.tweens.add({
          targets:glow,x:x+Phaser.Math.Between(-18,18),y:y+Phaser.Math.Between(-14,14),
          alpha:{from:.35,to:1},duration:1900+i*170,yoyo:true,repeat:-1,
          delay:i*240,ease:"Sine.easeInOut"
        });
      });

      // Tiny butterflies hover over the meadow in short, unhurried arcs.
      const butterflySpots = [[930,685],[1015,715],[1160,365],[1220,405]];
      const wingColors = [0xd5b6a0,0xe0d3a7,0xb9c7a0,0xc5a9b5];
      butterflySpots.forEach(([x,y],i) => {
        const insect = this.add.container(x,y).setDepth(y+3);
        const left = this.add.rectangle(-3,0,4,3,wingColors[i],.95);
        const right = this.add.rectangle(3,0,4,3,wingColors[(i+1)%wingColors.length],.95);
        const body = this.add.rectangle(0,1,1,4,0x3b4034,.95);
        insect.add([left,right,body]);
        this.tweens.add({targets:[left,right],scaleY:.35,duration:230,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
        this.tweens.add({
          targets:insect,x:x+Phaser.Math.Between(-20,20),y:y-Phaser.Math.Between(8,22),
          duration:2400+i*310,yoyo:true,repeat:-1,delay:i*380,ease:"Sine.easeInOut"
        });
      });

      // Small shore crabs: a few bright shell pixels and alternating sideways steps.
      [[325,625],[350,650],[1370,675],[1430,705]].forEach(([x,y],i) => {
        const crab = this.add.container(x,y).setDepth(y+1);
        crab.add(this.add.ellipse(0,3,13,4,0x26352e,.28));
        crab.add(this.add.rectangle(0,0,7,4,i%2?0x9b765e:0xb18468));
        crab.add(this.add.rectangle(-2,-2,3,2,0xd0a17b));
        crab.add(this.add.rectangle(-5,1,2,1,0xdbc49a));
        crab.add(this.add.rectangle(5,1,2,1,0xdbc49a));
        crab.add(this.add.rectangle(-5,-3,1,1,0x242d29));
        crab.add(this.add.rectangle(5,-3,1,1,0x242d29));
        this.tweens.add({
          targets:crab,x:x+(i%2? -9:9),duration:1800+i*210,yoyo:true,repeat:-1,
          delay:i*430,ease:"Sine.easeInOut"
        });
      });
    }

    createTree(x, y, scale = 1) {
      if (!this.textures.exists("muse-tree")) {
        const texture = this.textures.createCanvas("muse-tree", 48, 58);
        const ctx = texture.getContext();
        ctx.imageSmoothingEnabled = false;

        // Exposed roots and a branching, weather-darkened trunk.
        ctx.fillStyle = "#26372f";
        ctx.fillRect(19,34,11,20); ctx.fillRect(13,48,10,3); ctx.fillRect(27,49,10,3);
        ctx.fillRect(16,29,5,13); ctx.fillRect(28,27,5,16);
        ctx.fillStyle = "#594936";
        ctx.fillRect(20,29,9,24); ctx.fillRect(16,34,5,12); ctx.fillRect(29,33,4,12);
        ctx.fillStyle = "#876747";
        ctx.fillRect(22,32,3,17); ctx.fillRect(18,38,2,7);
        ctx.fillStyle = "#b18a5d";
        ctx.fillRect(23,36,1,8); ctx.fillRect(25,45,1,4);

        // Uneven canopy silhouette, built from stepped pixel clusters.
        const rows = [
          [20,27],[15,32],[11,36],[8,39],[6,41],[4,43],[3,44],
          [2,45],[2,45],[3,44],[4,43],[5,42],[6,41],[8,39],
          [10,37],[13,34],[16,31],[19,28]
        ];
        const palette = ["#20392f","#294536","#34523c","#426144","#58724a","#718354","#899064"];
        rows.forEach(([left,right],row) => {
          const y0=4+row*2;
          for(let x=left;x<=right;x++){
            const hash=(x*37+y0*19+(x*y0)%29)%41;
            const shade=hash<5?0:hash<13?1:hash<21?2:hash<29?3:hash<35?4:hash<39?5:6;
            ctx.fillStyle=palette[shade];
            ctx.fillRect(x,y0,1,2);
            if(hash%7===0){ctx.fillStyle=palette[Math.min(6,shade+1)];ctx.fillRect(x+1,y0,1,1);}
          }
        });
        // Branch gaps, mossy clusters and directional leaf highlights.
        [[9,15],[13,10],[34,13],[38,21],[8,29],[29,31],[17,25],[37,34]].forEach(([x,y])=>{
          ctx.fillStyle="#1e342c";ctx.fillRect(x,y,3,3);
        });
        [[9,10],[14,7],[28,8],[35,15],[39,23],[12,25],[24,18],[31,27],[18,34]].forEach(([x,y],i)=>{
          ctx.fillStyle=i%3===0?"#a0a06a":i%3===1?"#87945d":"#748957";
          ctx.fillRect(x,y,3,2);ctx.fillRect(x+1,y-1,2,1);
        });
        // Lichen and tiny warm leaves break up the large dark masses.
        [[6,22],[11,31],[33,8],[40,29],[26,38]].forEach(([x,y],i)=>{
          ctx.fillStyle=i%2?"#b0a06b":"#9c9b67";ctx.fillRect(x,y,2,1);
        });
        texture.refresh();
      }
      const tree=this.add.container(x,y).setScale(scale).setDepth(y);
      tree.add(this.add.ellipse(2,22,76,19,0x172b25,.38));
      tree.add(this.add.ellipse(-2,19,48,9,0x526044,.16));
      const canopy=this.add.image(0,-17,"muse-tree").setOrigin(.5,.5).setScale(1.55);
      tree.add(canopy);
      // Trunk roots remain visible below the canopy and anchor the tree to the soil.
      tree.add(this.add.rectangle(-8,15,5,8,0x594936).setRotation(-.28));
      tree.add(this.add.rectangle(8,16,5,9,0x594936).setRotation(.3));
      this.tweens.add({targets:canopy,angle:{from:-.65,to:.65},duration:3100+(x%7)*190,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
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
      if(!this.textures.exists("muse-rock")){
        const texture=this.textures.createCanvas("muse-rock",48,36);
        const ctx=texture.getContext();
        ctx.imageSmoothingEnabled=false;
        // Stepped silhouette with a dark underside and chipped upper planes.
        const rows=[
          [15,31],[10,37],[7,41],[5,43],[4,44],[3,45],[4,44],
          [6,42],[8,40],[11,37],[15,33],[19,29]
        ];
        rows.forEach(([left,right],row)=>{
          const yy=7+row*2;
          for(let xx=left;xx<=right;xx++){
            const n=(xx*13+yy*17+(xx*yy)%19)%31;
            ctx.fillStyle=n<5?"#3d4c42":n<12?"#59685a":n<22?"#707c68":n<28?"#899079":"#a1a087";
            ctx.fillRect(xx,yy,1,2);
          }
        });
        ctx.fillStyle="#39483e";
        ctx.fillRect(7,26,34,5);ctx.fillRect(12,30,25,3);
        ctx.fillStyle="#a5a38a";
        ctx.fillRect(12,11,8,2);ctx.fillRect(17,9,5,2);ctx.fillRect(29,13,7,2);
        ctx.fillStyle="#c0b99a";
        ctx.fillRect(15,10,3,1);ctx.fillRect(31,12,3,1);
        // Moss follows cracks rather than sitting as a flat green cap.
        ctx.fillStyle="#647b55";
        ctx.fillRect(8,19,5,2);ctx.fillRect(10,21,3,2);ctx.fillRect(34,23,5,2);
        ctx.fillStyle="#91a06a";
        ctx.fillRect(9,19,2,1);ctx.fillRect(36,23,2,1);
        // Hairline fractures and mineral flecks.
        ctx.fillStyle="#35463c";
        ctx.fillRect(23,15,1,5);ctx.fillRect(22,19,3,1);ctx.fillRect(30,17,1,4);
        ctx.fillStyle="#c1b997";
        [[20,13],[25,11],[37,18],[14,24],[28,26]].forEach(([px,py])=>ctx.fillRect(px,py,1,1));
        texture.refresh();
      }
      const rock=this.add.container(x,y).setDepth(y).setScale(scale);
      rock.add(this.add.ellipse(1,7,48,13,0x172a24,.4));
      rock.add(this.add.image(0,-2,"muse-rock").setScale(1.12));
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

    createCinematicLighting() {
      // Low-resolution radial light textures retain crisp pixel-art sampling
      // while providing soft, restrained illumination at selected landmarks.
      const makeGlow=(key,inner,outer)=>{
        if(this.textures.exists(key))return;
        const texture=this.textures.createCanvas(key,96,96);
        const ctx=texture.getContext();
        ctx.imageSmoothingEnabled=false;
        const gradient=ctx.createRadialGradient(48,48,2,48,48,47);
        gradient.addColorStop(0,inner);
        gradient.addColorStop(.28,outer);
        gradient.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);texture.refresh();
      };
      makeGlow("muse-warm-glow","rgba(255,221,151,0.42)","rgba(225,169,98,0.16)");
      makeGlow("muse-cool-glow","rgba(174,213,198,0.28)","rgba(102,159,153,0.10)");

      const warm=this.add.image(1082,360,"muse-warm-glow").setScale(3.8,2.7)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(.68).setDepth(368);
      this.tweens.add({targets:warm,alpha:{from:.48,to:.78},scaleX:{from:3.6,to:4},duration:2800,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});

      const markerGlow=this.add.image(690,443,"muse-warm-glow").setScale(2.5,2.1)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(.22).setDepth(454);
      this.tweens.add({targets:markerGlow,alpha:{from:.12,to:.3},duration:3600,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});

      [[290,570,1.1],[1460,510,.9],[1370,655,.75]].forEach(([x,y,scale],i)=>{
        const glow=this.add.image(x,y,"muse-cool-glow").setScale(scale*2.4,scale*1.25)
          .setBlendMode(Phaser.BlendModes.ADD).setAlpha(.34).setDepth(y-1);
        this.tweens.add({targets:glow,alpha:{from:.18,to:.4},duration:3100+i*430,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      });

      // Thin diagonal shafts break up the flat canopy light; opacity stays low.
      const shafts=this.add.graphics().setDepth(8);
      [[475,300,120,300],[575,285,88,260],[710,270,105,280]].forEach(([x,y,w,h],i)=>{
        shafts.fillStyle(i===1?0xd0c79b:0xb8c5a0,.035);
        shafts.fillPoints([
          new Phaser.Geom.Point(x,y),new Phaser.Geom.Point(x+9,y),
          new Phaser.Geom.Point(x+w,y+h),new Phaser.Geom.Point(x+w-24,y+h)
        ],true);
      });
      shafts.destroy();

      // Foreground mist drifts independently from the camera-fixed weather.
      this.foregroundMist=[];
      [[440,520,270,46],[760,855,360,52],[1210,500,300,42]].forEach(([x,y,w,h],i)=>{
        const mist=this.add.ellipse(x,y,w,h,0xb8c9b6,.035).setDepth(1120+i);
        this.foregroundMist.push(mist);
        this.tweens.add({
          targets:mist,x:x+(i%2? -55:65),alpha:{from:.018,to:.055},
          scaleX:{from:.92,to:1.12},duration:9200+i*1500,yoyo:true,repeat:-1,ease:"Sine.easeInOut"
        });
      });

      // A subtle camera-space vignette frames the play area without hiding detail.
      if(!this.textures.exists("muse-vignette")){
        const texture=this.textures.createCanvas("muse-vignette",160,90);
        const ctx=texture.getContext();ctx.imageSmoothingEnabled=false;
        const gradient=ctx.createRadialGradient(80,45,25,80,45,78);
        gradient.addColorStop(0,"rgba(5,14,18,0)");
        gradient.addColorStop(.72,"rgba(5,14,18,0.04)");
        gradient.addColorStop(1,"rgba(5,14,18,0.28)");
        ctx.fillStyle=gradient;ctx.fillRect(0,0,160,90);texture.refresh();
      }
      this.add.image(0,0,"muse-vignette").setOrigin(0).setScrollFactor(0)
        .setDisplaySize(this.scale.width,this.scale.height).setAlpha(.62).setDepth(1950);
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
      this.editMode = false;
      this.buildMode = type;
      this.clearObjectSelection();
      this.touchDirections.clear();
      window.dispatchEvent(new CustomEvent("muse:toast",{detail:"PLACE "+type.toUpperCase()+" · TAP AN OPEN PATCH OF LAND"}));
    }

    startEditing() {
      this.buildMode = null;
      this.editMode = true;
      this.clearObjectSelection();
      window.dispatchEvent(new CustomEvent("muse:toast",{detail:"EDIT MODE · TAP AN OBJECT TO SELECT IT"}));
    }

    cancelBuilding() {
      this.buildMode = null;
      this.editMode = false;
      this.clearObjectSelection();
      window.dispatchEvent(new CustomEvent("muse:builder-selection",{detail:{selected:false}}));
      window.dispatchEvent(new CustomEvent("muse:builder-mode",{detail:{active:false}}));
    }

    clearObjectSelection() {
      this.selectedWorldObject = null;
      this.selectionOutline?.destroy();
      this.selectionOutline = null;
    }

    handleBuildPointer(pointer) {
      if (!this.buildMode && !this.editMode) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (this.editMode) {
        const objects = this.readPlacedObjects();
        if (this.selectedWorldObject) {
          if (!Phaser.Geom.Polygon.Contains(this.landPolygon, point.x, point.y)) return;
          const selected = objects.find(item => item.id === this.selectedWorldObject);
          if (!selected) { this.clearObjectSelection(); return; }
          selected.x = Math.round(point.x);
          selected.y = Math.round(point.y);
          this.persistWorldObjects(objects);
          this.loadPlacedObjects();
          this.selectedWorldObject = selected.id;
          this.drawSelectionOutline(selected);
          window.dispatchEvent(new CustomEvent("muse:toast",{detail:"OBJECT MOVED"}));
          return;
        }
        const nearest = objects.map(item=>({...item,distance:Phaser.Math.Distance.Between(point.x,point.y,item.x,item.y)}))
          .filter(item=>item.distance<48).sort((a,b)=>a.distance-b.distance)[0];
        if (!nearest) return;
        this.selectedWorldObject = nearest.id;
        this.drawSelectionOutline(nearest);
        window.dispatchEvent(new CustomEvent("muse:builder-selection",{detail:{selected:true,type:nearest.type}}));
        window.dispatchEvent(new CustomEvent("muse:toast",{detail:nearest.type.toUpperCase()+" SELECTED · TAP ANOTHER SPOT TO MOVE"}));
        return;
      }
      if (!this.buildMode || !Phaser.Geom.Polygon.Contains(this.landPolygon, point.x, point.y)) {
        window.dispatchEvent(new CustomEvent("muse:toast",{detail:"CHOOSE A SPOT ON THE ISLAND"}));
        return;
      }
      const item = {id:"prop-"+Date.now()+"-"+Math.floor(Math.random()*10000),type:this.buildMode,x:Math.round(point.x),y:Math.round(point.y)};
      const objects = this.readPlacedObjects();
      objects.push(item);
      if (!this.persistWorldObjects(objects)) return;
      this.drawPlacedObject(item);
      window.dispatchEvent(new CustomEvent("muse:object-placed",{detail:{type:item.type,count:objects.length}}));
    }

    persistWorldObjects(objects) {
      try { localStorage.setItem("muse.world.objects.v1",JSON.stringify(objects)); return true; }
      catch { window.dispatchEvent(new CustomEvent("muse:toast",{detail:"WORLD STORAGE IS FULL"})); return false; }
    }

    drawSelectionOutline(item) {
      this.selectionOutline?.destroy();
      this.selectionOutline=this.add.circle(item.x,item.y-8,35).setStrokeStyle(2,0xe5d6a5,.95).setFillStyle(0xe5d6a5,.08).setDepth(3000);
      this.tweens.add({targets:this.selectionOutline,alpha:{from:.45,to:1},scale:{from:.92,to:1.08},duration:850,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
    }

    deleteSelectedObject() {
      if (!this.selectedWorldObject) return;
      const objects=this.readPlacedObjects().filter(item=>item.id!==this.selectedWorldObject);
      if (!this.persistWorldObjects(objects)) return;
      this.clearObjectSelection();
      this.loadPlacedObjects();
      window.dispatchEvent(new CustomEvent("muse:builder-selection",{detail:{selected:false}}));
      window.dispatchEvent(new CustomEvent("muse:toast",{detail:"OBJECT REMOVED FROM YOUR SHORE"}));
    }

    transformSelectedObject(change = {}) {
      if (!this.selectedWorldObject) return;
      const objects=this.readPlacedObjects();
      const selected=objects.find(item=>item.id===this.selectedWorldObject);
      if (!selected) return;
      const rotationDelta=Number(change.rotationDelta)||0;
      const scaleDelta=Number(change.scaleDelta)||0;
      selected.rotation=((Number(selected.rotation)||0)+rotationDelta+360)%360;
      selected.scale=Phaser.Math.Clamp((Number(selected.scale)||1)+scaleDelta,.55,1.8);
      if (!this.persistWorldObjects(objects)) return;
      this.loadPlacedObjects();
      this.drawSelectionOutline(selected);
      window.dispatchEvent(new CustomEvent("muse:toast",{detail:"OBJECT TRANSFORM UPDATED"}));
    }

    readPlacedObjects() {
      try {
        const value=JSON.parse(localStorage.getItem("muse.world.objects.v1")||"[]");
        return Array.isArray(value)?value.filter(item=>item&&["tree","lantern","flowers","stone"].includes(item.type)&&Number.isFinite(item.x)&&Number.isFinite(item.y)): [];
      } catch { return []; }
    }

    loadPlacedObjects() {
      (this.placedObjects || []).forEach(display => display.destroy());
      this.placedObjects=[];
      this.readPlacedObjects().forEach(item=>this.drawPlacedObject(item));
    }

    drawPlacedObject(item) {
      const {x,y,type}=item;
      const object=this.add.container(x,y).setDepth(y+2);
      const g=this.add.graphics();
      object.add(g);
      this.placedObjects ||= [];
      this.placedObjects.push(object);
      if(type==="tree"){
        g.fillStyle(0x263b30,.34);g.fillEllipse(0,12,40,13);
        g.fillStyle(0x594b39,1);g.fillRect(-3,-13,6,22);
        g.fillStyle(0x344b39,1);g.fillRect(-15,-31,30,20);
        g.fillStyle(0x506b48,1);g.fillRect(-19,-27,38,13);
        g.fillStyle(0x819066,1);g.fillRect(-10,-35,17,8);
        g.fillStyle(0xa2a477,.8);g.fillRect(-7,-32,5,3);
        this.tweens.add({targets:g,angle:{from:-1,to:1},duration:2600,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      } else if(type==="lantern"){
        g.fillStyle(0x26352d,.35);g.fillEllipse(0,9,19,7);
        g.fillStyle(0x4b4030,1);g.fillRect(-2,-17,4,25);
        g.fillStyle(0x756447,1);g.fillRect(-6,-23,12,9);
        g.fillStyle(0xe7c98c,.9);g.fillRect(-3,-21,6,5);
        const glow=this.add.circle(0,-18,23,0xe8c88b,.08);
        object.add(glow);
        this.tweens.add({targets:glow,alpha:{from:.03,to:.14},scale:{from:.85,to:1.18},duration:1800,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
      } else if(type==="flowers"){
        g.fillStyle(0x36513d,.8);g.fillRect(-1,-9,2,11);g.fillRect(5,-6,2,8);
        [[-5,-11,0xd6b9a0],[1,-15,0xe0cf9a],[8,-9,0xb7a6c6],[1,-6,0xe5d9c1]].forEach(([fx,fy,color])=>{g.fillStyle(color,1);g.fillRect(fx,fy,4,4);});
      } else {
        g.fillStyle(0x283b34,.35);g.fillEllipse(0,5,25,9);
        g.fillStyle(0x777b69,1);g.fillRect(-9,-7,18,10);
        g.fillStyle(0xa4a18a,1);g.fillRect(-6,-10,11,4);
        g.fillStyle(0x505f50,1);g.fillRect(-7,3,14,2);
      }
      object.setRotation(Phaser.Math.DegToRad(Phaser.Math.Wrap(Number(item.rotation)||0,0,360)));
      object.setScale(Phaser.Math.Clamp(Number(item.scale)||1,.55,1.8));
      object.setData("museObjectId",item.id);
      return object;
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
