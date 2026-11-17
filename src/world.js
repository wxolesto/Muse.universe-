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
      this.cameras.main.startFollow(this.player, true, 0.075, 0.075);
      this.cameras.main.setZoom(1.08);
      this.cameras.main.setDeadzone(110, 70);
      this.keys = this.input.keyboard.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E");
      this.game.events.on("touch-move", this.onTouchMove, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off("touch-move", this.onTouchMove, this));
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

      const grass = this.add.graphics();
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

    drawPath() {
      const g = this.add.graphics();
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
      const roof = this.add.triangle(0, -42, -75, 18, 75, 18, 0x4a4036).setStrokeStyle(3, 0x302e29);
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
      const tree = this.add.container(x, y).setScale(scale).setDepth(y);
      tree.add(this.add.ellipse(3, 19, 65, 19, 0x263b31, 0.35));
      tree.add(this.add.rectangle(0, 0, 9, 31, 0x65513c));
      tree.add(this.add.rectangle(-3, 4, 3, 24, 0x8a6b48));
      tree.add(this.add.rectangle(0, -24, 47, 35, 0x344e3d));
      tree.add(this.add.rectangle(-12, -34, 29, 22, 0x4f6948));
      tree.add(this.add.rectangle(13, -29, 25, 25, 0x5c714b));
      tree.add(this.add.rectangle(-3, -43, 18, 15, 0x78805a));
      tree.add(this.add.rectangle(11, -20, 10, 8, 0x819064));
      tree.add(this.add.rectangle(-16, -20, 8, 7, 0x71865b));
      tree.list.forEach(item => item.setOrigin(0.5));
      return tree;
    }

    createPlayer() {
      this.player = this.add.container(820, 620);
      this.player.setDepth(620);
      const shadow = this.add.ellipse(0, 15, 24, 9, 0x17251e, 0.48);
      const body = this.add.container(0, 0);
      const cape = this.add.rectangle(0, -1, 15, 19, 0x6c7560);
      const torso = this.add.rectangle(0, -4, 12, 15, 0xc0aa83);
      const head = this.add.rectangle(0, -17, 11, 11, 0xd7b995);
      const hair = this.add.rectangle(0, -22, 12, 5, 0x393a31);
      const legs = this.add.rectangle(0, 8, 11, 6, 0x333b37);
      const scarf = this.add.rectangle(5, -8, 4, 10, 0xb17e69);
      body.add([cape, torso, head, hair, legs, scarf]);
      this.player.add([shadow, body]);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.player.body.setSize(15, 15).setOffset(-7, -1);
      this.player.body.setDrag(900, 900);
      this.player.body.setMaxVelocity(145, 145);
      this.playerVisual = body;
      this.tweens.add({targets:body,y:-2,duration:680,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
    }

    createBirds() {
      this.birds = [];
      for (let i = 0; i < 2; i++) {
        const bird = this.add.container(650 + i * 300, 390 + i * 90).setDepth(450 + i);
        const shadow = this.add.ellipse(0, 9, 12, 4, 0x1d3029, 0.25);
        const body = this.add.rectangle(0, 0, 8, 6, i ? 0x2d2925 : 0x38342c);
        const head = this.add.rectangle(4, -3, 5, 5, i ? 0x353029 : 0x454035);
        const beak = this.add.rectangle(8, -2, 3, 2, 0xc28a4f);
        const wing = this.add.rectangle(-1, -2, 5, 3, 0x70634c);
        bird.add([shadow, body, head, beak, wing]);
        bird.setScale(1.15);
        this.birds.push({bird,wing,phase:i*2});
        this.tweens.add({targets:bird,x:bird.x + (i ? -95 : 110),y:bird.y - 28,duration:5200 + i*900,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
        this.tweens.add({targets:wing,angle:{from:-24,to:25},duration:180,yoyo:true,repeat:-1,delay:i*60});
      }
    }

    createAtmosphere() {
      this.fireflies = [];
      for (let i = 0; i < 22; i++) {
        const x = 350 + (i * 61) % 1050;
        const y = 300 + (i * 89) % 480;
        const mote = this.add.rectangle(x, y, 2, 2, 0xe6d49a, 0.0).setDepth(950);
        this.fireflies.push(mote);
        this.tweens.add({targets:mote,alpha:{from:0.03,to:0.65},y:y-12,duration:1100+(i%5)*300,yoyo:true,repeat:-1,delay:i*95});
      }
      this.shade = this.add.rectangle(0, 0, 2400, 1600, 0x10172c, 0).setOrigin(0).setScrollFactor(0).setDepth(2000);
      this.shade.setBlendMode(Phaser.BlendModes.MULTIPLY);
    }

    updateLighting() {
      const hour = new Date().getHours() + new Date().getMinutes()/60;
      let alpha = 0;
      if (hour < 5 || hour > 21) alpha = 0.34;
      else if (hour < 7) alpha = 0.24 * (7-hour)/2;
      else if (hour > 18) alpha = 0.26 * (hour-18)/3;
      else if (hour > 16) alpha = 0.08 * (hour-16)/2;
      this.tweens.add({targets:this.shade,alpha,duration:5000,ease:"Sine.easeInOut"});
    }

    inspectNearby() {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1050, 365);
      if (distance < 145) {
        window.dispatchEvent(new CustomEvent("muse:toast", { detail: "THE OLD WAYFARER — A small house with a light left on." }));
      } else {
        window.dispatchEvent(new CustomEvent("muse:toast", { detail: "Only wind, grass and the sound of the sea." }));
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
      if (Phaser.Input.Keyboard.JustDown(keys.E)) this.inspectNearby();
      if (vx < 0) this.playerVisual.setScale(-1, 1);
      else if (vx > 0) this.playerVisual.setScale(1, 1);
      this.playerVisual.alpha = (vx || vy) ? 0.98 : 1;
      this.birds.forEach(({bird}, i) => {
        bird.y += Math.sin(this.time.now / 380 + i * 2) * 0.025;
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
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: "100%", height: "100%" },
    scene: [FirstShore]
  };
  return new Phaser.Game(config);
}
