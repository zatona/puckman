/**
 * Puck-man (2012)
 * by zatona@gmail.com(Olivier VALLEE)
 * 
 * An attempt to reproduce in Html5 Canvas/js
 * Pac-man video-game
 * by Toru Iwatani/Shigeo Funaki/Toshio Kai/Namco
 */

var	NONE="NONE",LEFT="LEFT",RIGHT="RIGHT",UP="UP",DOWN="DOWN";

var	SCATTER="SCATTER",CHASE="CHASE",FRIGHTENED="FRIGHTENED";

var	BLINKY="BLINKY",PINKY="PINKY",INKY="INKY",CLYDE="CLYDE",
	PUCKMAN="PUCKMAN",PUCKMAN_START="PUCKMAN_START",PEN_EXIT="PEN_EXIT",
	BLINKY_START="BLINKY_START",PINKY_START="PINKY_START",INKY_START="INKY_START",CLYDE_START="CLYDE_START",
	BLINKY_TARGET="BLINKY_TARGET",PINKY_TARGET="PINKY_TARGET",INKY_TARGET="INKY_TARGET",CLYDE_TARGET="CLYDE_TARGET";

var directions= new Array(NONE,UP,DOWN,LEFT,RIGHT);
var ghostDirections= new Array(UP,DOWN,LEFT,RIGHT);
var angleDirections = {NONE:-1,LEFT:180,RIGHT:0,UP:270,DOWN:90};
var OppositeDirections = {NONE:NONE,LEFT:RIGHT,RIGHT:LEFT,UP:DOWN,DOWN:UP};
var ghostNames=new Array(BLINKY,PINKY,INKY,CLYDE);
var ghostTargets = {BLINKY:BLINKY_TARGET,PINKY:PINKY_TARGET,INKY:INKY_TARGET,CLYDE:CLYDE_TARGET};
var ghostPens = {BLINKY:PINKY_START,PINKY:PINKY_START,INKY:INKY_START,CLYDE:CLYDE_START};

var offsets={NONE:new Offset(0,0),LEFT:new Offset(-1,0),RIGHT:new Offset(1,0),UP:new Offset(0,-1),DOWN:new Offset(0,1)};

var TILE_SIZE=8;
var ACTOR_SIZE=TILE_SIZE*2;
var ANIM1="1",ANIM2="2";

/**
 * Game
 */
function Game(){
	this.model=new Model();
	this.controller=new Controller(this.model);
	this.view=new View(this.model,this.controller);
	this.view.start("puckman-maze.txt");
};

function Maze(xmax,ymax){
	this.xmax=xmax;
	this.ymax=ymax;
	this.elems;
	this.marks;

	this.marks=new Array();

	this.elems=new Array();
	for(var iy=0;iy<this.ymax;iy++){this.elems[iy]=new Array();}

	this.putElem=function(elem){this.elems[elem.y][elem.x]=elem;};
	this.getElem=function(x,y){return this.elems[y][x];};
	this.getElemByDirection=function(x,y,direction){
		switch(direction){
		case LEFT: 	if(x==0){return this.getElem(this.xmax-1,y);}else{return this.getElem(x-1,y);}
		case RIGHT: if(x==this.xmax-1){return this.getElem(0,y);}else{return this.getElem(x+1,y);}
		case UP: 	if(y==0){return this.getElem(x,this.ymax-1);}else{return this.getElem(x,y-1);}
		case DOWN: 	if(y==this.ymax-1){return this.getElem(x,0);}else{return this.getElem(x,y+1);}
		}
		return this.getElem(x,y);
	};

	this.putMark=function(position,label){
		this.marks[label]=this.getElem(position.x,position.y);
	};
	this.getMark=function(label){return this.marks[label];};
};

function Offset(x,y){
	this.x=x;
	this.y=y;
	
	this.add=function(offset){
		var reset=false;
		var xOffset=this.x;
		var yOffset=this.y;
		if(offset.x!=0){
			xOffset=this.x+offset.x;
			yOffset=TILE_SIZE/2;
			if(xOffset>=TILE_SIZE){xOffset=0;reset=true;}else if(xOffset<0){xOffset=TILE_SIZE-1;reset=true;}
		}else if(offset.y!=0){
			xOffset=TILE_SIZE/2;
			yOffset=this.y+offset.y;
			if(yOffset>=TILE_SIZE){yOffset=0;reset=true;}else if(yOffset<0){yOffset=TILE_SIZE-1;reset=true;}			
		}
		this.x=xOffset;
		this.y=yOffset;
		return reset;
	};
}

function Position(x,y){
	this.x=x;
	this.y=y;
	/** Calculate distance with position */
	this.getDistance=function(position){return Math.abs(this.x-position.x)+Math.abs(this.y-position.y);};
};

function Path(x,y){
	Position.call(this, x, y);
	this.isIntersection=false;
	this.connections=Array();
	this.addConnection=function(direction,path){this.connections[direction]=path;};
	this.speedModifier=1;
};

function Block(x,y){
	Position.call(this, x, y);
};

function Door(x,y){
	Path.call(this, x, y);
	this.isOpen=false;
};

function Food(isSuper){
	this.isSuper=isSuper;
	this.isEaten=false;
}

function Ball(position,isSuper){
	Position.call(this, position.x, position.y);
	Food.call(this,isSuper);
};

function Actor(position,name){
	Position.call(this, position.x, position.y);
	Food.call(false);
	this.name=name;
	this.offset=new Offset(TILE_SIZE,TILE_SIZE/2);
	this.direction=NONE;
	this.moveTo=function(position){
		this.x=position.x;
		this.y=position.y;
	};
	this.speed=0.5;
};

function Ghost(position,name){
	Actor.call(this,position,name);
	Food.call(this,false);
	this.target=new Position(0,0);
	this.setTarget=function(target){this.target=target;};
	this.status=SCATTER;
};
function Blinky(position){
	Ghost.call(this,position,BLINKY);
	this.direction=RIGHT;
};

function Pinky(position){
	Ghost.call(this,position,PINKY);
};

function Inky(position){
	Ghost.call(this,position,INKY);
};

function Clyde(position){
	Ghost.call(this,position,CLYDE);
};

function Puckman(position){
	Actor.call(this,position,PUCKMAN);
	this.isSuper=false;	
	this.eat=function(food){this.isSuper=food.isSuper;};
	this.speed=0.8;
};

/**
 * Model
 */
function Model(){
	this.time=0;
	this.maze;
	this.balls;
	this.ghosts;
	this.puckman;
	
	/** Observable Pattern */
	this.view=null;
	this.addView=function(view){this.view=view;};
	this.updateView=function(){if(this.view!=null)this.view.update();};
	
	/**
	 * Load Model from text
	 * x : wall / d : door /  : path
	 * . : ball / o : energizer
	 * m : Puckman
	 * b : Blinky, and pen exit
	 * p : Pinky
	 * i : Inky
	 * c : Clyde
	 * B : Blinky target
	 * B : Pinky target
	 * B : Inky target
	 * B : Clyde target
	 */
	this.load=function(modelText){
		
		/** Set Maze and Actors */
		modelTextLines = modelText.split(/\r\n|\n/);
		this.maze=new Maze(modelTextLines[0].length,modelTextLines.length);
		this.balls=new Array();
		this.ghosts=new Array();
		for(var iy=0;iy<this.maze.ymax;iy++){
			for(var ix=0;ix<this.maze.xmax;ix++){
				var modelTextChar = modelTextLines[iy][ix];

				if(modelTextChar=="x"){
					this.maze.putElem(new Block(ix,iy));
				}else if(modelTextChar=="d"){
					this.maze.putElem(new Door(ix,iy));
				}else{
					var path=new Path(ix,iy);
					this.maze.putElem(path);					
					
					if(modelTextChar=="t"){
						path.speedModifier=0.5;					
					}else if(modelTextChar=="."){
						this.balls[path.x+":"+path.y]=new Ball(path,false);
					}else if(modelTextChar=="o"){
						this.balls[path.x+":"+path.y]=new Ball(path,true);
					}else if(modelTextChar=="m"){
						this.puckman=new Puckman(path);
						this.maze.putMark(path,PUCKMAN_START);
					}else if(modelTextChar=="b"){
						this.ghosts[BLINKY]=new Blinky(path);
						this.maze.putMark(path,PEN_EXIT);
						this.maze.putMark(path,BLINKY_START);
					}else if(modelTextChar=="p"){
						this.ghosts[PINKY]=new Pinky(path);
						this.maze.putMark(path,PINKY_START);
					}else if(modelTextChar=="i"){
						this.ghosts[INKY]=new Inky(path);
						this.maze.putMark(path,BLINKY_START);
					}else if(modelTextChar=="c"){
						this.ghosts[CLYDE]=new Clyde(path);
						this.maze.putMark(path,CLYDE_START);
					}else if(modelTextChar=="B"){
						this.maze.putMark(path,BLINKY_TARGET);
					}else if(modelTextChar=="P"){
						this.maze.putMark(path,PINKY_TARGET);
					}else if(modelTextChar=="I"){
						this.maze.putMark(path,INKY_TARGET);
					}else if(modelTextChar=="C"){
						this.maze.putMark(path,CLYDE_TARGET);
					}
				}				
			}
		}

		/** Set Path connections */
		for(var iy=0;iy<this.maze.ymax;iy++){
			for(var ix=0;ix<this.maze.xmax;ix++){
				var elem=this.maze.getElem(ix,iy);
				if(elem instanceof Path){
					var connectionCount=0;
					var leftElem=this.maze.getElemByDirection(elem.x,elem.y,LEFT);
					var rightElem=this.maze.getElemByDirection(elem.x,elem.y,RIGHT);
					var upElem=this.maze.getElemByDirection(elem.x,elem.y,UP);
					var downElem=this.maze.getElemByDirection(elem.x,elem.y,DOWN);
					if(leftElem instanceof Path && !(leftElem instanceof Door)){elem.addConnection(LEFT,leftElem);connectionCount++;}
					if(rightElem instanceof Path && !(rightElem instanceof Door)){elem.addConnection(RIGHT,rightElem);connectionCount++;}
					if(upElem instanceof Path && !(upElem instanceof Door)){elem.addConnection(UP,upElem);connectionCount++;}
					if(downElem instanceof Path && !(downElem instanceof Door)){elem.addConnection(DOWN,downElem);connectionCount++;}
					if(connectionCount>2){elem.isIntersection=true;}
				}
			}
		}
	};
	
	this.animate=function(inputDirection){
		/** Animate model */
		this.time++;
		
		/** Define Target */
		if(this.time==1){
			/** Ghost Scatter */
			for(var gi in this.ghosts){this.ghosts[gi].setTarget(this.maze.getMark(ghostTargets[gi]));}						
		}else if(this.time==500){
			/** Ghost Chase */
			for(var gi in this.ghosts){
				var ghost=this.ghosts[gi];
				if(!ghost.isEaten){
					ghost.setTarget(this.puckman);
					ghost.speed=0.9;
				}
			}	
		}
		
		/** Move */
		this.movePuckman(inputDirection);
		for(var gi in this.ghosts){this.moveGhost(gi);}
		
		/** Update views */
		this.updateView();
	};
	
	this.movePuckman=function(direction){
		
		/** Eat */
		var ball=this.balls[this.puckman.x+":"+this.puckman.y];
		if(ball!=undefined){
			this.puckman.eat(ball);
			if(ball.isSuper){
				for(var gi in this.ghosts){
					var ghost=this.ghosts[gi];
					ghost.status=FRIGHTENED;
					ghost.speed=0.5;
				}				
			}
			delete(this.balls[this.puckman.x+":"+this.puckman.y]);
		}
		
		for(var gi in this.ghosts){
			var ghost=this.ghosts[gi];
			if(ghost.status==FRIGHTENED && !ghost.isEaten && ghost.x==this.puckman.x && ghost.y==this.puckman.y){
				this.puckman.eat(ghost);
				ghost.isEaten=true;
				ghost.target=this.maze.getMark(PEN_EXIT);
				ghost.speed=1;
				console.log("puckman eat "+gi);
			}
		}
		
		/** Move */
		if(this.time%4<(4*this.puckman.speed)){
			if(direction!=NONE){
				var path=this.maze.getElem(this.puckman.x, this.puckman.y);
				var dPath=path.connections[direction];
				if(dPath!=null && dPath!=undefined){this.puckman.direction=direction;}
			}
			
			if(this.puckman.direction!=NONE){
				var path=this.maze.getElem(this.puckman.x, this.puckman.y);
				var dPath=path.connections[this.puckman.direction];
				
				if(	(dPath!=undefined) 
					|| (this.direction=LEFT && this.puckman.offset.x>TILE_SIZE/2)
					|| (this.direction=RIGHT && this.puckman.offset.x<TILE_SIZE/2)
					|| (this.direction=UP && this.puckman.offset.y>TILE_SIZE/2)
					|| (this.direction=DOWN && this.puckman.offset.y<TILE_SIZE/2)
				){
					if(this.puckman.offset.add(offsets[this.puckman.direction])){
						this.puckman.moveTo(dPath);
					}			
				}
			}
		}
		
	};
	
	this.chooseGhostDirection=function(ghost){
		var direction=ghost.direction;
		var path=this.maze.getElem(ghost.x,ghost.y);
		
		if(path.isIntersection){
			var distance=10000;
			for(gd in ghostDirections){
				if(!(ghost.direction==OppositeDirections[ghostDirections[gd]])){
					var dPath = path.connections[ghostDirections[gd]];
					if(dPath!=undefined){
						var dDistance=dPath.getDistance(ghost.target);
						//console.log("Ghost estimate "+ghostDirections[gd]+" as "+dDistance);
						if(dDistance<distance){
							distance=dDistance;
							direction=ghostDirections[gd];
						}
					}
				}
			}
		}else{
			if(path.connections[ghost.direction]==undefined){
				for(gd in ghostDirections){
					if(!(ghost.direction==OppositeDirections[ghostDirections[gd]])
						&& path.connections[ghostDirections[gd]]!=undefined){
						return ghostDirections[gd];
					}
				}
			}
		}
		
		return direction;
	};
	
	this.moveGhost=function(name){
		var ghost=this.ghosts[name];
		var path=this.maze.getElem(ghost.x,ghost.y);
		if(this.time%4<(4*ghost.speed*path.speedModifier)){			
			if(ghost.offset.x==TILE_SIZE/2 && ghost.offset.y==TILE_SIZE/2){
				ghost.direction=this.chooseGhostDirection(ghost);
			}
			
			if(ghost.offset.add(offsets[ghost.direction])){
				ghost.moveTo(path.connections[ghost.direction]);
			}
		}
		
		/** Target Reached */
		if(ghost.x==ghost.target.x && ghost.y==ghost.target.y){
			var penExit=this.maze.getMark(PEN_EXIT);
			if(penExit.x==ghost.x && penExit.y==ghost.y){
				ghost.target=this.maze.getMark(ghostPens[ghost.name]);
				console.log("PEN EXIT REACHED["+ghost.target.x+","+ghost.target.y+"]");
			//}else{
				ghost.isEaten=false;
				ghost.speed=0.5;
				console.log("PEN REACHED");
			}
			ghost.status=SCATTER;
			ghost.setTarget(this.maze.getMark(ghostTargets[ghost.name]));				
		}
	};
};

/**
 * View
 */
function View(model,controller){
	view=this;
	this.model=model;
	this.model.addView(this);
	this.controller=controller;
	this.scale=1;
	this.setCanvas;
	this.setContext;
	this.actorCanvas;
	this.actorContext;
	this.sprites;
	
	/** Frame trigger */
	window.requestAnimFrame = (function(callback){
		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function(callback){window.setTimeout(callback, 100);};
	})();

	/** Key-down Listener */
	keyDirectionMap={37:LEFT,38:UP,39:RIGHT,40:DOWN};
	function keyDownListener(evt){
		var direction=keyDirectionMap[evt.keyCode];
		//console.log("keyDownListener evt="+evt.keyCode+" direction="+direction);
		if(direction!=undefined){
			view.controller.changePuckmanDirection(direction);
		}
	};
	window.addEventListener('keydown',keyDownListener,true);
	
	/** Start view */
	this.start=function(mazeFileName){
		this.controller.load(mazeFileName);
		
		/** Init set */
		this.setCanvas = document.createElement('canvas');
		this.setCanvas.width = this.model.maze.xmax * TILE_SIZE * this.scale;
		this.setCanvas.height = this.model.maze.ymax * TILE_SIZE * this.scale;
		this.setCanvas.setAttribute("style","z-index:0;position:absolute;left:0px;top:0px;");
		this.setContext = this.setCanvas.getContext("2d");
		document.body.appendChild(this.setCanvas);
		
		/** Init Actor */
		this.actorCanvas = document.createElement('canvas');
		this.actorCanvas.width = this.model.maze.xmax * TILE_SIZE * this.scale;
		this.actorCanvas.height = this.model.maze.ymax * TILE_SIZE * this.scale;
		this.actorCanvas.setAttribute("style","z-index:1;position:absolute;left:0px;top:0px;");
		this.actorContext = this.actorCanvas.getContext("2d");
		document.body.appendChild(this.actorCanvas);		
		
		/** Load Sprite */
		this.loadSprites();
		
		/** Draw */
		this.drawSet();
		this.drawActors();
		
		/** Start animation */
		this.controller.animate();
	};
	
	this.drawSet=function(){
		for(var iy=0;iy<this.model.maze.ymax;iy++){
			for(var ix=0;ix<this.model.maze.xmax;ix++){
				var elem=this.model.maze.getElem(ix,iy);
				
				function drawRoundRec(context,x,y,width,height,radius){
					context.moveTo(x + radius, y);
					context.lineTo(x + width - radius, y);
					context.quadraticCurveTo(x + width, y, x + width, y + radius);
					context.lineTo(x + width, y + height - radius);
					context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
					context.lineTo(x + radius, y + height);
					context.quadraticCurveTo(x, y + height, x, y + height - radius);
					context.lineTo(x, y + radius);
					context.quadraticCurveTo(x, y, x + radius, y);				
				}
				
				if(elem instanceof Path){
					this.setContext.beginPath();
					drawRoundRec(this.setContext,(elem.x*TILE_SIZE-TILE_SIZE/3)*this.scale,(elem.y*TILE_SIZE-TILE_SIZE/3)*this.scale,(TILE_SIZE*5/3)*this.scale,(TILE_SIZE*5/3)*this.scale,TILE_SIZE/2*this.scale);
					this.setContext.fillStyle = "#222222";
					this.setContext.fill();
					this.setContext.closePath();							
				}else if(elem instanceof Door){
					this.setContext.beginPath();
					drawRoundRec(this.setContext,(elem.x*TILE_SIZE-TILE_SIZE/3)*this.scale,(elem.y*TILE_SIZE)*this.scale,(TILE_SIZE*5/3)*this.scale,(TILE_SIZE)*this.scale,TILE_SIZE/2*this.scale);
					this.setContext.fillStyle = "#666666";
					this.setContext.fill();
					this.setContext.closePath();														
				}

				
			}
		}
	};
	
	this.drawActors=function(){
		this.drawBalls();
		this.drawPuckman();
		this.drawGhosts();
	};

	this.drawBalls=function(){
		for(var bi in this.model.balls){
			var ball = this.model.balls[bi];

			var spriteName="BALL";
			if(ball.isSuper){spriteName="SUPERBALL";}	
			
			if(this.model.time % 20 < 15){spriteName=spriteName+ANIM1;		
			}else{spriteName=spriteName+ANIM2;}
			
			this.drawSprite(this.actorContext, spriteName,ball.x*TILE_SIZE*this.scale, ball.y*TILE_SIZE*this.scale);
		}
	};

	this.drawGhosts=function(){
		for(var gi in this.model.ghosts){
			var ghost = this.model.ghosts[gi];

			var spriteName=ghost.name;
			if(ghost.isEaten){spriteName="GHOST_EATEN";				
			}else if(ghost.status==FRIGHTENED){spriteName="GHOST_FRIGHTENED";}
			if(this.model.time % 20 < 10){spriteName=spriteName+ANIM1;
			}else{spriteName=spriteName+ANIM2;}
			if(!ghost.isEaten&&ghost.status!=FRIGHTENED){spriteName=spriteName+"_"+ghost.direction;}
			
			this.drawSprite(this.actorContext, spriteName, (ghost.x*TILE_SIZE+ghost.offset.x-ACTOR_SIZE/2)*this.scale, (ghost.y*TILE_SIZE+ghost.offset.y-ACTOR_SIZE/2)*this.scale);		
		}
	};

	this.drawPuckman=function(){
		var puckman = this.model.puckman;
		
		var spriteName="PUCKMAN_";

		if(puckman.isSuper){
			spriteName=spriteName+"S_";
		}
		
		if(this.model.time % 20 < 10){
			spriteName=spriteName+"NONE";		
		}else{
			spriteName=spriteName+puckman.direction;
		}
		
		
		this.drawSprite(this.actorContext, spriteName, (puckman.x*TILE_SIZE+puckman.offset.x-ACTOR_SIZE/2)*this.scale, (puckman.y*TILE_SIZE+puckman.offset.y-ACTOR_SIZE/2)*this.scale);	
	};

	this.drawSprite=function(context, spriteName, x, y){
		try{
			var sprite=this.sprites[spriteName];
			context.drawImage(sprite.canvas,sprite.x,sprite.y,sprite.xsize,sprite.ysize,x, y,sprite.xsize,sprite.ysize);
		}catch(e){
			 alert("Can't draw sprite[name="+spriteName+";x="+x+";y="+y+"]"+e);
		}
	};
	
	function Sprite(canvas,x,y,xsize,ysize){
		this.canvas=canvas;
		this.x=x;
		this.y=y;
		this.xsize=xsize;
		this.ysize=ysize;	
	};

	this.loadSprites=function(){
		this.sprites = new Array();
		var spriteCanvas;
		var spriteContext;
		
		spriteCanvas = document.createElement('canvas');
		spriteCanvas.width = 10*ACTOR_SIZE*this.scale;
		spriteCanvas.height = 40*ACTOR_SIZE*this.scale;
		//spriteCanvas.setAttribute("style","z-index:0;position:absolute;left:0px;top:0px;");
		spriteCanvas.setAttribute("style","background-color:blue;");
		spriteContext = spriteCanvas.getContext("2d");		
		//document.body.appendChild(spriteCanvas);	
		
		var x=0;
		var y=0;
		
		//BALL
		var ballSpriteAnims=new Array(ANIM1,ANIM2);
		var ballcolor="255,255,255";
		var ballRadius = 0.15*TILE_SIZE*this.scale;
		var ballStartAngle = (Math.PI / 180) * 0;
		var endAngle   = (Math.PI / 180) * 360;

		for(var ai in ballSpriteAnims){
			switch(ballSpriteAnims[ai]){
				case ANIM1:
					ballRadius = 0.15*TILE_SIZE*this.scale;			
					break;
				case ANIM2:
					ballRadius = 0.15*TILE_SIZE*this.scale;			
					break;
			}

			spriteContext.beginPath();
			spriteContext.fillStyle = "rgba("+ballcolor+",0.5)";
			spriteContext.arc(x*TILE_SIZE*this.scale+TILE_SIZE*this.scale/2, y*TILE_SIZE*this.scale+TILE_SIZE*this.scale/2, ballRadius, ballStartAngle, endAngle, false);
			spriteContext.fill();
			spriteContext.closePath();
		
			ballRadius = 0.1*TILE_SIZE*this.scale;
			spriteContext.beginPath();
			spriteContext.fillStyle = "rgba("+ballcolor+",1)";
			spriteContext.arc(x*TILE_SIZE*this.scale+TILE_SIZE*this.scale/2, y*TILE_SIZE*this.scale+TILE_SIZE*this.scale/2, ballRadius, ballStartAngle, endAngle, false);
			spriteContext.fill();
			spriteContext.closePath();
			
			this.sprites["BALL"+ballSpriteAnims[ai]]=new Sprite(spriteCanvas,x*TILE_SIZE*this.scale,y*TILE_SIZE*this.scale, TILE_SIZE*this.scale, TILE_SIZE*this.scale);
		
			x++;
		}
		
		//SUPERBALL
		for(var ai in ballSpriteAnims){
			switch(ballSpriteAnims[ai]){
				case ANIM1:
					aBallColor = "rgba("+ballcolor+",0.3)";			
					break;
				case ANIM2:
					aBallColor = "rgba("+ballcolor+",1)";			
					break;
			}	
			ballRadius = 0.5*TILE_SIZE*this.scale;			
			spriteContext.beginPath();
			spriteContext.fillStyle = aBallColor;
			spriteContext.arc(x*TILE_SIZE*this.scale+TILE_SIZE*this.scale/2, y*TILE_SIZE*this.scale+TILE_SIZE*this.scale/2, ballRadius, ballStartAngle, endAngle, false);
			spriteContext.fill();
			spriteContext.closePath();
		
			this.sprites["SUPERBALL"+ballSpriteAnims[ai]]=new Sprite(spriteCanvas,x*TILE_SIZE*this.scale, y*TILE_SIZE*this.scale, TILE_SIZE*this.scale, TILE_SIZE*this.scale);	
		
			x++;
		}
		y++;
		
		x=0;
		//PUCKMAN
		var paccolor = "rgba(255,225,0,1)";
		
		for(var di in directions){
			var pacAngleDirection=angleDirections[directions[di]];
			var pacmouthAngle = (directions[di]==NONE)?0:60;
			var pacradius = TILE_SIZE*this.scale*0.8;
			var pacstartAngle = (Math.PI / 180) * ((pacmouthAngle/2)+pacAngleDirection);
			var pacendAngle   = (Math.PI / 180) * ((360 - (pacmouthAngle/2))+pacAngleDirection);
			
			spriteContext.fillStyle = paccolor;
			spriteContext.beginPath();
			spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2);
			spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, pacradius, pacstartAngle, pacendAngle, false);
			spriteContext.fill();
			spriteContext.closePath();			

			var spriteName="PUCKMAN_"+directions[di];
			this.sprites[spriteName]=new Sprite(spriteCanvas,x*ACTOR_SIZE*this.scale, y*ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale);
			
			x++;
		}
		y++;
		
		x=0;
		//SUPER PUCKMAN
		paccolor = "rgba(255,255,100,1)";
		
		for(var di in directions){
			var pacAngleDirection=angleDirections[directions[di]];
			var pacmouthAngle = (directions[di]==NONE)?0:60;
			var pacradius = TILE_SIZE*this.scale*0.8;
			var pacstartAngle = (Math.PI / 180) * ((pacmouthAngle/2)+pacAngleDirection);
			var pacendAngle   = (Math.PI / 180) * ((360 - (pacmouthAngle/2))+pacAngleDirection);
			
			spriteContext.fillStyle = paccolor;
			spriteContext.beginPath();
			spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2);
			spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, pacradius, pacstartAngle, pacendAngle, false);
			spriteContext.fill();
			spriteContext.closePath();			

			var spriteName="PUCKMAN_S_"+directions[di];
			this.sprites[spriteName]=new Sprite(spriteCanvas,x*ACTOR_SIZE*this.scale, y*ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale);
			
			x++;
		}
		y++;
				
		x=0;
		//GHOST
		//var ghostNames=new Array(BLINKY,PINKY,INKY,CLYDE);
		var ghostColors={BLINKY:"255,128,128",PINKY:"255,128,255",INKY:"128,255,255",CLYDE:"255,128,64"};
		var ghostradius = TILE_SIZE*this.scale*0.8;
		var ghostSpriteAnims=new Array(ANIM1,ANIM2);
		for(var gi in ghostNames){
			var ghostColor="rgba("+ghostColors[ghostNames[gi]]+",0.8)";
			for(var ai in ghostSpriteAnims){
				x=0;
				for(var di in directions){
					//HEAD
					spriteContext.beginPath();
					spriteContext.fillStyle = ghostColor;
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, ghostradius, (Math.PI / 180) * (180), 0, false);
					spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.fill();
					spriteContext.closePath();
					
					spriteContext.beginPath();
					spriteContext.fillStyle = "#FFFFFF";
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3, ghostradius/4, 0, (Math.PI / 180) * (360), false);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3, ghostradius/4, 0, (Math.PI / 180) * (360), false);
					spriteContext.fill();
					spriteContext.closePath();
					
					//EYES
					spriteContext.beginPath();
					spriteContext.fillStyle = "#000000";
					switch(directions[di]){
						case NONE:
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							break;
						case LEFT:
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3-ghostradius/8, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius/3-ghostradius/8, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							break;
						case RIGHT:
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3+ghostradius/8, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius/3+ghostradius/8, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							break;
						case UP:
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3-ghostradius/8, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3-ghostradius/8, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							break;
						case DOWN:
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3+ghostradius/8, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*1/3+ghostradius/8, ghostradius/12, 0, (Math.PI / 180) * (360), false);
							break;
					}	
					spriteContext.fill();
					spriteContext.closePath();
					
					//SHEET
					spriteContext.beginPath();
					spriteContext.fillStyle = ghostColor;
					switch(ghostSpriteAnims[ai]){
						case ANIM1:
							spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
							spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
							spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
							break;
						case ANIM2:
							spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (90), false);
							spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-2*ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
							spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
							spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3,(Math.PI / 180) * (180), (Math.PI / 180) * (90), true );
							break;
					}
					spriteContext.fill();
					spriteContext.closePath();
					
					var spriteName=ghostNames[gi]+ghostSpriteAnims[ai]+"_"+directions[di];
					this.sprites[spriteName]=new Sprite(spriteCanvas,x*ACTOR_SIZE*this.scale, y*ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale);
		
					x++;
				}
				y++;
			}
		}
		
		x=0;
		//FRIGHTENED GHOST
		var ghostradius = TILE_SIZE*this.scale*0.8;
		var ghostSpriteAnims=new Array(ANIM1,ANIM2);
		var ghostColor="rgba(51,102,255,0.8)";
		for(var ai in ghostSpriteAnims){
			x=0;
			
			//HEAD
			spriteContext.beginPath();
			spriteContext.fillStyle = ghostColor;
			spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, ghostradius, (Math.PI / 180) * (180), 0, false);
			spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
			spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
			spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2);
			spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
			spriteContext.fill();
			spriteContext.closePath();
			
			
			//EYES
			spriteContext.beginPath();
			spriteContext.fillStyle = "#FFFFFF";
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/5)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/4, 0, (Math.PI / 180) * (360), false);
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/5)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/4, 0, (Math.PI / 180) * (360), false);
			spriteContext.fill();
			spriteContext.closePath();
			spriteContext.beginPath();
			spriteContext.fillStyle = "#000000";
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/5)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/8, 0, (Math.PI / 180) * (360), false);
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/5)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/8, 0, (Math.PI / 180) * (360), false);
			spriteContext.fill();
			spriteContext.closePath();
			
			//MOUTH
			spriteContext.beginPath();
			spriteContext.strokeStyle = "#FFFFFF";
			spriteContext.lineWidth = ghostradius/1.5;
			spriteContext.moveTo((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/6)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.9/3)*this.scale);
			spriteContext.lineTo((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/6)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.9/3)*this.scale);
			spriteContext.lineCap = "round";
			spriteContext.stroke();
			spriteContext.closePath();
			spriteContext.beginPath();
			spriteContext.strokeStyle = "#000000";
			spriteContext.lineWidth = 0.8;
//			spriteContext.moveTo((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/6)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.6/3)*this.scale);
//			spriteContext.lineTo((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/6)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*2/3)*this.scale);
//			spriteContext.moveTo((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.6/3)*this.scale);
//			spriteContext.lineTo((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*2/3)*this.scale);
//			spriteContext.moveTo((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/6)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.6/3)*this.scale);
//			spriteContext.lineTo((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/6)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*2/3)*this.scale);
//			spriteContext.moveTo((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/3)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.8/3)*this.scale);
//			spriteContext.lineTo((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/3)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.8/3)*this.scale);
			spriteContext.lineCap = "round";
			spriteContext.stroke();			
			spriteContext.fill();
			spriteContext.closePath();

			spriteContext.beginPath();
			spriteContext.strokeStyle = "#aaaaaa";
			spriteContext.lineWidth = ghostradius/3;
			spriteContext.moveTo((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/6)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.9/3)*this.scale);
			spriteContext.lineTo((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/6)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1.9/3)*this.scale);
			spriteContext.lineCap = "round";
			spriteContext.stroke();
			spriteContext.closePath();

			
			//SHEET
			spriteContext.beginPath();
			spriteContext.fillStyle = ghostColor;
			switch(ghostSpriteAnims[ai]){
				case ANIM1:
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					break;
				case ANIM2:
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (90), false);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-2*ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3,(Math.PI / 180) * (180), (Math.PI / 180) * (90), true );
					break;
			}
			spriteContext.fill();
			spriteContext.closePath();
			
			var spriteName="GHOST_FRIGHTENED"+ghostSpriteAnims[ai];
			this.sprites[spriteName]=new Sprite(spriteCanvas,x*ACTOR_SIZE*this.scale, y*ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale);

			y++;
		}
		
		x=0;
		//EATEN GHOST
		var ghostradius = TILE_SIZE*this.scale*0.8;
		var ghostSpriteAnims=new Array(ANIM1,ANIM2);
		var ghostColor="rgba(51,102,255,0.2)";
		for(var ai in ghostSpriteAnims){
			x=0;
			
			//HEAD
			spriteContext.beginPath();
			spriteContext.fillStyle = ghostColor;
			spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, ghostradius, (Math.PI / 180) * (180), 0, false);
			spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
			spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
			spriteContext.lineTo( x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius,y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2);
			spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
			spriteContext.fill();
			spriteContext.closePath();
			
			
			//EYES
			spriteContext.beginPath();
			spriteContext.fillStyle = "#FFFFFF";
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/5)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/4, 0, (Math.PI / 180) * (360), false);
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/5)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/4, 0, (Math.PI / 180) * (360), false);
			spriteContext.fill();
			spriteContext.closePath();
			spriteContext.beginPath();
			spriteContext.fillStyle = "#000000";
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2-ghostradius/5)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/12, 0, (Math.PI / 180) * (360), false);
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2+ghostradius/5)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/12, 0, (Math.PI / 180) * (360), false);
			spriteContext.fill();
			spriteContext.closePath();
			
			//SHEET
			spriteContext.beginPath();
			spriteContext.fillStyle = ghostColor;
			switch(ghostSpriteAnims[ai]){
				case ANIM1:
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius+ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					break;
				case ANIM2:
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (90), false);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2-ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius-2*ghostradius/3, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3, 0, (Math.PI / 180) * (180), false);
					spriteContext.moveTo(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4);
					spriteContext.arc(x*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale/2+ghostradius, y*ACTOR_SIZE*this.scale+ACTOR_SIZE*this.scale*3/4, ghostradius/3,(Math.PI / 180) * (180), (Math.PI / 180) * (90), true );
					break;
			}
			spriteContext.fill();
			spriteContext.closePath();
			
			var spriteName="GHOST_EATEN"+ghostSpriteAnims[ai];
			this.sprites[spriteName]=new Sprite(spriteCanvas,x*ACTOR_SIZE*this.scale, y*ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale, ACTOR_SIZE*this.scale);

			y++;
		}
		
	};
	
	/** 
	 * Update
	 * Clear view and draw model
	 */
	this.update=function(){
		/** Clear */
		this.actorContext.clearRect(0, 0, this.actorCanvas.width, this.actorCanvas.height);		
		/** Draw */
		this.drawActors();
		
		/** Animation Loop */
		requestAnimFrame(function(){view.controller.animate();});
	};	
};

/**
 * Controller
 */
function Controller(model){
	this.model=model;
	this.puckmanDirection=NONE;
		
	/** Load Maze from file */
	this.load=function(mazeFilename){
		fileText = Array();
		var fileRq = new XMLHttpRequest();		
		fileRq.open("GET", mazeFilename, false);
		fileText = fileRq.responseText;
		fileRq.onreadystatechange = function(){
			if (fileRq.readyState == 4){
				// Makes sure it's found the file.
				fileText = fileRq.responseText;
			}
		};
		fileRq.send(null);
		
		this.model.load(fileText);
	};
	
	/** Animate */
	this.animate=function(){
		this.model.animate(this.puckmanDirection);
	};
	
	/** Change Puckman direction */
	this.changePuckmanDirection=function(direction){
		this.puckmanDirection=direction;
	};
};