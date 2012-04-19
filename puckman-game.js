/**
 * Puck-man (2012)
 * by zatona@gmail.com(Olivier VALLEE)
 * follow : https://github.com/zatona/puckman
 * 
 * An attempt to reproduce in Html5 Canvas/js
 * original Pac-man video-game
 * by Toru Iwatani/Shigeo Funaki/Toshio Kai/Namco
 * 
 * DONE Manage eating process and score
 * DONE Puckman respawn
 * DONE Ghost respawn
 * DONE Puckman life count
 * DONE Ghost pen should be close for active ghost
 * DONE Display score 
 * DONE Add periodical change of ghost status
 * TODO Add general level configuration for speeds and ghost status change
 * TODO Add food bonus
 * DONE implement Blinky moves
 * DONE implement Pinky moves
 * DONE implement Inky moves
 * DONE implement Clide moves
 * TODO implement Elroy
 * TODO Ghost wait in Pen going up and down
 * TODO Ghost go out of Pen by the middle of the door
 * TODO Store high-score
 * TODO Add splash screen
 * TODO Add sounds 
 * TODO Add Sprite animation object
 */

window.onload = function(){new Game();};

var	NONE="NONE",LEFT="LEFT",RIGHT="RIGHT",UP="UP",DOWN="DOWN";
//var	NONE=0,LEFT=1,RIGHT=2,UP=3,DOWN=4;
var	PENNED="PENNED",RELEASED="RELEASED",SCATTER="SCATTER",CHASE="CHASE",FRIGHTENED="FRIGHTENED",RUNTOPEN="RUNTOPEN",RESPAWN="RESPAWN",
	NORMAL="NORMAL",SUPER="SUPER";
var	BLINKY="BLINKY",PINKY="PINKY",INKY="INKY",CLYDE="CLYDE",PUCKMAN="PUCKMAN";
var PUCKMAN_START="PUCKMAN_START",PEN_EXIT="PEN_EXIT",
	BLINKY_START="BLINKY_START",PINKY_START="PINKY_START",INKY_START="INKY_START",CLYDE_START="CLYDE_START",
	BLINKY_TARGET="BLINKY_TARGET",PINKY_TARGET="PINKY_TARGET",INKY_TARGET="INKY_TARGET",CLYDE_TARGET="CLYDE_TARGET";

var directions= new Array(NONE,UP,DOWN,LEFT,RIGHT);
var ghostNames=new Array(BLINKY,PINKY,INKY,CLYDE);

var TILE_SIZE=8;
var HALF_TILE_SIZE=TILE_SIZE/2;

var frameRate=100;

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
	this.targets=new Array();
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

	this.putTarget=function(target){this.targets[target.name]=target;};
	this.getTarget=function(name){return this.targets[name];};
};

function Offset(x,y){
	this.x=x;
	this.y=y;
	
	this.add=function(offset,multiplicator){
		var reset=false;
		var xOffset=this.x;
		var yOffset=this.y;
		var mi=0;
		while(reset==false && mi<multiplicator){
			if(offset.x!=0){
				xOffset=xOffset+offset.x;
				yOffset=TILE_SIZE/2;
				if(xOffset>=TILE_SIZE){xOffset=0;reset=true;}
				else if(xOffset<0){xOffset=TILE_SIZE-1;reset=true;}
				else if(xOffset==TILE_SIZE/2){break;}
			}else if(offset.y!=0){
				xOffset=TILE_SIZE/2;
				yOffset=yOffset+offset.y;
				if(yOffset>=TILE_SIZE){yOffset=0;reset=true;}
				else if(yOffset<0){yOffset=TILE_SIZE-1;reset=true;}
				else if(yOffset==TILE_SIZE/2){break;}
			}
			mi++;
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
	this.getDistance=function(position){return Math.pow(Math.abs(this.x-position.x),2)+Math.pow(Math.abs(this.y-position.y),2);};
	/** Add front and side offset depending on direction*/
	this.add=function(frontOffset,sideOffset,direction){
		var xOffset=0;
		var yOffset=0;
		switch(direction){
			case RIGHT:xOffset=frontOffset;yOffset=sideOffset;break;
			case LEFT:xOffset=-1*frontOffset;yOffset=-1*sideOffset;break;
			case UP:xOffset=-1*sideOffset;yOffset=-1*frontOffset;break;
			case DOWN:xOffset=sideOffset;yOffset=frontOffset;break;
		}
		return new Position(this.x+xOffset,this.y+yOffset);
	};
	/** Compare with other position*/
	this.isOver=function(position){return this.x==position.x && this.y==position.y;};
};

function Target(position,name){
	Position.call(this, position.x, position.y);
	this.name=name;
}

function Path(x,y){
	Position.call(this, x, y);
	this.isIntersection=false;
	this.connections=new Array();
	this.addConnection=function(direction,path){this.connections[direction]=path;};
	this.speedModifier=1;
	this.isGhostRestrictionZone=false;
};

function Block(x,y){
	Position.call(this, x, y);
};

function Door(x,y){
	Path.call(this, x, y);
};

function Food(){
	this.isEaten=false;
	this.score=0;
	this.calorie=0;
}

function Ball(position,isEnergizer){
	Position.call(this, position.x, position.y);
	Food.call(this);
	this.isEnergizer=isEnergizer;
	this.score=this.isEnergizer?20:10;
	this.calorie=this.isEnergizer?3:1;
};

function Actor(position,name){
	Target.call(this,position,name);
	Food.call(this);
	this.offset=new Offset(TILE_SIZE,TILE_SIZE/2);
	this.startPosition=position;
	this.direction=NONE;
	this.speed=0;
	this.free=false;
	this.status;
	this.moveTo=function(position){this.x=position.x;this.y=position.y;};
};

function Ghost(position,name){
	Actor.call(this,position,name);
	this.target=new Target(new Position(0,0),"NONE");
};
/** Blinky aka "Akabei" or "Macky"*/
function Blinky(position){Ghost.call(this,position,BLINKY);};
/** Pinky aka "Micky"*/
function Pinky(position){Ghost.call(this,position,PINKY);};
/** Inky aka "Aosuke" or "Mucky"*/
function Inky(position){Ghost.call(this,position,INKY);};
/** Clyde aka "Guzuta" or "Mocky"*/
function Clyde(position){Ghost.call(this,position,CLYDE);};

function Puckman(position){
	Actor.call(this,position,PUCKMAN);
	this.isEaten=true;
	this.food=null;
	this.life=3;
};

/**
 * Model
 */
function Model(){
	var oppositeDirections = {NONE:NONE,LEFT:RIGHT,RIGHT:LEFT,UP:DOWN,DOWN:UP};
	var ghostDirections= new Array(UP,LEFT,DOWN,RIGHT);
	var ghostTargets = {BLINKY:BLINKY_TARGET,PINKY:PINKY_TARGET,INKY:INKY_TARGET,CLYDE:CLYDE_TARGET};
	var ghostPens = {BLINKY:PINKY_START,PINKY:PINKY_START,INKY:INKY_START,CLYDE:CLYDE_START};
	var ghostReleasedDirection = {BLINKY:LEFT,PINKY:UP,INKY:RIGHT,CLYDE:LEFT};	
	var speeds = {PENNED:0.3,RELEASED:0.3,SCATTER:0.5,CHASE:0.75,FRIGHTENED:0.5,RUNTOPEN:1,RESPAWN:0,NORMAL:0.8,SUPER:0.9};	
	var offsets={NONE:new Offset(0,0),LEFT:new Offset(-1,0),RIGHT:new Offset(1,0),UP:new Offset(0,-1),DOWN:new Offset(0,1)};

	this.time=0;
	this.frightTime=-1;
	
	this.cycles=[7,20,7,20,5,-1];
	this.cycleIndex=0;
	this.cycleTime=0;
	this.cycleStatus=SCATTER;	
	
	this.ballCounter=0;
	
	this.maze;
	this.balls;
	this.ghosts;
	this.puckman;
	this.highscore=0;
	
	/** Observable Pattern */
	this.view=null;
	this.addView=function(view){this.view=view;};
	this.updateView=function(){if(this.view!=null)this.view.update();};
	
	/**
	 * Load Model from text
	 * x : wall / d : door /  : path 
	 * t: tunnel path(speed limit to ghost) /y : y path(up forbidden to ghost)  /z : z path(up forbidden to ghost with ball) 
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
		this.ballCounter=0;
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
					
					if(modelTextChar=="y"){
						path.isGhostRestrictionZone=true;
					}if(modelTextChar=="z"){
						path.isGhostRestrictionZone=true;
						this.balls[path.x+":"+path.y]=new Ball(path,false);
					}else if(modelTextChar=="t"){
						path.speedModifier=0.5;					
					}else if(modelTextChar=="."){
						this.balls[path.x+":"+path.y]=new Ball(path,false);
					}else if(modelTextChar=="o"){
						this.balls[path.x+":"+path.y]=new Ball(path,true);
					}else if(modelTextChar=="m"){
						this.puckman=new Puckman(path);
						this.maze.putTarget(new Target(path,PUCKMAN_START));
					}else if(modelTextChar=="b"){
						this.ghosts[BLINKY]=new Blinky(path);
						this.maze.putTarget(new Target(path,PEN_EXIT));
					}else if(modelTextChar=="p"){
						this.ghosts[PINKY]=new Pinky(path);
						this.maze.putTarget(new Target(path,PINKY_START));
					}else if(modelTextChar=="i"){
						this.ghosts[INKY]=new Inky(path);
						this.maze.putTarget(new Target(path,INKY_START));
						this.maze.putTarget(new Target(path,BLINKY_START));
					}else if(modelTextChar=="c"){
						this.ghosts[CLYDE]=new Clyde(path);
						this.maze.putTarget(new Target(path,CLYDE_START));
					}else if(modelTextChar=="B"){
						this.maze.putTarget(new Target(path,BLINKY_TARGET));
					}else if(modelTextChar=="P"){
						this.maze.putTarget(new Target(path,PINKY_TARGET));
					}else if(modelTextChar=="I"){
						this.maze.putTarget(new Target(path,INKY_TARGET));
					}else if(modelTextChar=="C"){
						this.maze.putTarget(new Target(path,CLYDE_TARGET));
					}
				}				
			}
		}

		/** Set Path connections */
		for(var iy=0;iy<this.maze.ymax;iy++){
			for(var ix=0;ix<this.maze.xmax;ix++){
				var elem=this.maze.getElem(ix,iy);
				if(elem instanceof Path || elem instanceof Door){
					var connectionCount=0;
					var leftElem=this.maze.getElemByDirection(elem.x,elem.y,LEFT);
					var rightElem=this.maze.getElemByDirection(elem.x,elem.y,RIGHT);
					var upElem=this.maze.getElemByDirection(elem.x,elem.y,UP);
					var downElem=this.maze.getElemByDirection(elem.x,elem.y,DOWN);
					if(leftElem instanceof Path ||leftElem instanceof Door){elem.addConnection(LEFT,leftElem);connectionCount++;}
					if(rightElem instanceof Path ||rightElem instanceof Door){elem.addConnection(RIGHT,rightElem);connectionCount++;}
					if(upElem instanceof Path|| upElem instanceof Door){elem.addConnection(UP,upElem);connectionCount++;}
					if(downElem instanceof Path|| downElem instanceof Door){elem.addConnection(DOWN,downElem);connectionCount++;}
					if(connectionCount>2){elem.isIntersection=true;}
				}
			}
		}
	};
	
	this.start=function(){
		if(this.puckman.life==0){
			this.time=0;
			this.frightTime=-1;
			this.puckman.isEaten=true;
			this.puckman.life=3;
			this.puckman.score=0;
			this.ballCounter=0;
			for(var bi in this.balls){
				var ball=this.balls[bi];
				ball.isEaten=false;
			}
		}

		if(this.puckman.isEaten && this.puckman.life>0){
			/** Respawn Puckman*/
			this.changePuckmanStatus(this.puckman,RESPAWN);
			
			/** Respawn Ghosts*/
			for(var gi in this.ghosts){
				var ghost=this.ghosts[gi];
				this.changeGhostStatus(ghost,RESPAWN);			
				ghost.x=ghost.startPosition.x;
				ghost.y=ghost.startPosition.y;
			};
			
			/** Initialize Cycle*/
			this.cycleIndex=0;
			this.cycleTime=0;
			this.cycleStatus=SCATTER;
			
			/** Initialize Ghost status timer*/
			this.ghostStatus=SCATTER;
			this.statusTime=0;
			this.ghostStatusCnt=0;
			
			return true;
		}
		return false;
	};
	
	/**
	 * Animation loop 
	 */
	this.animate=function(inputDirection){
		/** Time count */
		this.time++;
		
		if(!this.puckman.isEaten && this.puckman.life>0){
			this.statusTime++;
			if(this.frightTime>0){this.frightTime--;}	
			
			/**Cycle change*/
			if(this.cycleTime==0){
				if(this.cycleIndex>0&&this.cycleStatus==SCATTER){this.cycleStatus=CHASE;}else{this.cycleStatus=SCATTER;}
				this.cycleTime=this.cycles[this.cycleIndex++]*frameRate;
			}else if(this.cycleTime>0){
				this.cycleTime--;
			}
						
			/** Move */
			this.movePuckman(inputDirection);
			for(var gi in this.ghosts){this.moveGhost(gi);}
		}
		
		/** Update views */
		this.updateView();
	};
	
	this.changePuckmanStatus=function(puckman,status){
		if(status==RESPAWN){
			puckman.x=puckman.startPosition.x;
			puckman.y=puckman.startPosition.y;
			puckman.offset=new Offset(TILE_SIZE,TILE_SIZE/2);
			puckman.direction=NONE;
			puckman.status=NORMAL;
			puckman.food=null;
			puckman.isEaten=false;
			puckman.free=true;
			puckman.life=puckman.life-1;	
		}else if(status==SUPER){
			puckman.status=SUPER;						
		}else{
			puckman.status=NORMAL;			
		}
		puckman.speed=speeds[puckman.status];
	}
	
	this.changeGhostStatus=function(ghost,status){
		if(ghost.status!=status){
			//console.log("["+ghost.name+"] change status to "+status);
			if(status==RESPAWN){
				ghost.offset=new Offset(TILE_SIZE,TILE_SIZE/2);
				ghost.isEaten=false;
				ghost.score=100;
				ghost.calories=10;
				ghost.direction=NONE;
				ghost.free=false;
			}
			if(status==RUNTOPEN){ghost.offset.x=TILE_SIZE/2;ghost.offset.y=TILE_SIZE/2;}
			if(ghost.status!=RELEASED&&ghost.status!=RUNTOPEN){ghost.direction=oppositeDirections[ghost.direction];}
			if(status==RELEASED){ghost.direction=ghostReleasedDirection[ghost.name];}
			ghost.status=status;
			ghost.speed=speeds[ghost.status];
		}
	};
	
	this.fright=function(){
		for(var gi in this.ghosts){
			var ghost=this.ghosts[gi];
			if(ghost.status==CHASE||ghost.status==SCATTER){this.changeGhostStatus(ghost,FRIGHTENED);}
		}
		this.frightTime=300;
	};
	
	this.eat=function(food){
		if(food instanceof Ball){
			if(food.isEnergizer){this.fright();this.changePuckmanStatus(this.puckman,SUPER);}
			this.ballCounter++;
		}
		if(!food.isEaten){this.puckman.food=food;this.puckman.score+=food.score;}
		if(this.puckman.score>this.highscore){this.highscore=this.puckman.score;}
		food.isEaten=true;
	};
	
	this.eatGhost=function(ghost){
		this.eat(ghost);
		this.changeGhostStatus(ghost,RUNTOPEN);
	};
		
	this.movePuckman=function(direction){
		/** Block */
		if(!this.puckman.free || this.puckman.isEaten){return;}
		
		/** Speed */
		if(this.time%HALF_TILE_SIZE>=(HALF_TILE_SIZE*this.puckman.speed)){return;}
				
		/** Eat Ball */
		var ball=this.balls[this.puckman.x+":"+this.puckman.y];
		if(ball!=undefined && !ball.isEaten){
			this.eat(ball);
			return;
		}
		
		/** Eat Ghost */
		for(var gi in this.ghosts){
			var ghost=this.ghosts[gi];
			if(ghost.status==FRIGHTENED && ghost.isOver(this.puckman)){
				this.eatGhost(ghost);
				return;
			}
		}
		
		/** Move */
		if(direction==NONE){return;};

		var path=this.maze.getElem(this.puckman.x, this.puckman.y);
		var dPath=path.connections[direction];
		if(dPath!=null && dPath!=undefined && !(dPath instanceof Door)){
			this.puckman.direction=direction;
		}
		dPath=path.connections[this.puckman.direction];
		
		if(	(dPath!=undefined) 
			|| (this.direction=LEFT && this.puckman.offset.x>TILE_SIZE/2)
			|| (this.direction=RIGHT && this.puckman.offset.x<TILE_SIZE/2)
			|| (this.direction=UP && this.puckman.offset.y>TILE_SIZE/2)
			|| (this.direction=DOWN && this.puckman.offset.y<TILE_SIZE/2)
		){
			if(this.puckman.offset.add(offsets[this.puckman.direction],1)){
				this.puckman.moveTo(dPath);
			}			
		}
	};
	
	this.findGhostTarget=function(ghost){
		if(ghost.status==RUNTOPEN){
			return this.maze.getTarget(PEN_EXIT);			
		}else if(ghost.status==RESPAWN){
			return this.maze.getTarget(ghostPens[ghost.name]);			
		}else if(ghost.status==RELEASED){
			return this.maze.getTarget(PEN_EXIT);
		}else if(ghost.status==PENNED){
			return this.maze.getTarget(ghostPens[ghost.name]);
		}else if(ghost.status==SCATTER){
			return this.maze.getTarget(ghostTargets[ghost.name]);
		}else if(ghost.status==CHASE){
			if(ghost.name==BLINKY){
				return this.puckman;
			}else if(ghost.name==PINKY){
				return this.puckman.add(4,0,this.puckman.direction);
			}else if(ghost.name==INKY){
				var blinky=this.ghosts[BLINKY];
				var aheadPuckman=this.puckman.add(2,0,this.puckman.direction);
				return new Position(aheadPuckman.x+(-1*(blinky.x-aheadPuckman.x)),aheadPuckman.y+(-1*(blinky.y-aheadPuckman.y)));
			}else if(ghost.name==CLYDE){
				if(ghost.getDistance(this.puckman)>64){return this.puckman;}
				else{return this.maze.getTarget(CLYDE_TARGET);}
			}
		}else if(ghost.status==FRIGHTENED){
			return this.maze.getTarget(ghostTargets[ghost.name]);
		}			
	};

	this.findGhostDirection=function(ghost){
		var direction=ghost.direction;
		var path=this.maze.getElem(ghost.x,ghost.y);
		
		if(path.isIntersection){
			var distance=10000;
			ghost.target=this.findGhostTarget(ghost);
			//var distanceEstimation="";
			for(gd in ghostDirections){
				if(!(ghost.direction==oppositeDirections[ghostDirections[gd]]) && !(path.isGhostRestrictionZone&&ghostDirections[gd]==UP&&!ghost.status!=FRIGHTENED)){
					var dPath = path.connections[ghostDirections[gd]];
					if(dPath!=undefined && (!(dPath instanceof Door) || ghost.status==PENNED || ghost.status==RELEASED)){
						var dDistance=dPath.getDistance(ghost.target);
						//distanceEstimation=distanceEstimation+"|["+ghostDirections[gd]+"]="+dDistance;
						if(dDistance<distance){distance=dDistance;direction=ghostDirections[gd];}
					}
				}
			}
			//console.log("["+ghost.name+"] estimate "+distanceEstimation+" choose="+direction);
		}else{
			if(path.connections[ghost.direction]==undefined){
				direction=oppositeDirections[direction];
				for(gd in ghostDirections){
					if(!(ghost.direction==oppositeDirections[ghostDirections[gd]])
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

		/** Pen */
		if(ghost.status==RESPAWN&&ghost.isEaten==false){
			if(ghost.name==BLINKY){this.changeGhostStatus(ghost,RELEASED);}
			else if(ghost.name==PINKY && this.ballCounter>1){this.changeGhostStatus(ghost,RELEASED);}
			else if(ghost.name==INKY && this.ballCounter>30){this.changeGhostStatus(ghost,RELEASED);}				
			else if(ghost.name==CLYDE && this.ballCounter>60){this.changeGhostStatus(ghost,RELEASED);}
			else{return;}
		}
		
		/** Status */
		if(ghost.status==FRIGHTENED){if(this.frightTime==0){this.changeGhostStatus(ghost, this.cycleStatus);}}
		else if(ghost.status==SCATTER||ghost.status==CHASE){if(ghost.status!=this.cycleStatus){this.changeGhostStatus(ghost, this.cycleStatus);}}
		else if(ghost.target!=null && ghost.isOver(ghost.target)){
			if(ghost.status==RELEASED&&ghost.target.name==PEN_EXIT){this.changeGhostStatus(ghost, this.cycleStatus);}
			else if(ghost.status==RUNTOPEN&&ghost.target.name==PEN_EXIT){this.changeGhostStatus(ghost,PENNED);}
			else if(ghost.status==PENNED&&ghost.target.name==ghostPens[ghost.name]){this.changeGhostStatus(ghost,RESPAWN);}
		}			
		
		/** Speed */
		var path=this.maze.getElem(ghost.x,ghost.y);
		if(this.time%HALF_TILE_SIZE>=(HALF_TILE_SIZE*ghost.speed*path.speedModifier)){return;}
		
		/** Eat */
		if((ghost.status==SCATTER||ghost.status==CHASE)&&ghost.isOver(this.puckman)){
			this.puckman.isEaten=true;
			//console.log(ghost.name+"["+ghost.status+"]"+"->EAT PUCKMAN");
		}
		
		/** Move */
		var multiplicator=1;
		if(ghost.isEaten){multiplicator=TILE_SIZE/4;}
		if(ghost.offset.x==TILE_SIZE/2 && ghost.offset.y==TILE_SIZE/2){ghost.direction=this.findGhostDirection(ghost);}
		if(ghost.offset.add(offsets[ghost.direction],multiplicator)){ghost.moveTo(path.connections[ghost.direction]);}
	};
};

/**
 * View
 */
function View(model,controller){
	view=this;
	
	var ACTOR_SIZE=TILE_SIZE*2;
	var ANIM1="1",ANIM2="2";
		
	this.model=model;
	this.model.addView(this);
	this.controller=controller;
	this.scale=2;
	this.setCanvas;
	this.setContext;
	this.actorCanvas;
	this.actorContext;
	this.statusCanvas;
	this.statusContext;
	this.sprites;
	
	this.displayTarget=false;
	
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
		}else if(evt.keyCode==32){/**SPACE*/
			view.controller.start();
		}else if(evt.keyCode==84){/**t*/
			view.displayTarget=!view.displayTarget;
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
		
		/** Init Status */
		this.statusCanvas = document.createElement('canvas');
		this.statusCanvas.width = this.model.maze.xmax * TILE_SIZE * this.scale;
		this.statusCanvas.height = this.model.maze.ymax * TILE_SIZE * this.scale;
		this.statusCanvas.setAttribute("style","z-index:1;position:absolute;left:0px;top:0px;");
		this.statusContext = this.statusCanvas.getContext("2d");
		document.body.appendChild(this.statusCanvas);		
		
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
					drawRoundRec(this.setContext,(elem.x*TILE_SIZE-TILE_SIZE/3)*this.scale,(elem.y*TILE_SIZE-TILE_SIZE/3)*this.scale,(TILE_SIZE*7/4)*this.scale,(TILE_SIZE*7/4)*this.scale,TILE_SIZE*2/5*this.scale);
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
	
	this.drawStatus=function(){
		var textFont  = "1.2em Lucida Sans Unicode";
		var fontColor =  "#ffffff";

		this.statusContext.font = textFont;
		this.statusContext.fillStyle = fontColor;

		/**HIGH SCORE*/
		this.statusContext.beginPath();
		this.statusContext.textAlign = "center";
		this.statusContext.fillText("HIGH SCORE", this.model.maze.xmax*TILE_SIZE/2*this.scale,(TILE_SIZE+TILE_SIZE/3)*this.scale);
		this.statusContext.closePath();	
		this.statusContext.beginPath();
		this.statusContext.textAlign = "center";
		this.statusContext.fillText(this.model.highscore, (this.model.maze.xmax*TILE_SIZE/2)*this.scale,(2*TILE_SIZE+TILE_SIZE/3)*this.scale);
		this.statusContext.closePath();									

		/**PLAYER 1 SCORE*/
		if(this.model.time % 20 < 10){
			this.statusContext.beginPath();
			this.statusContext.textAlign = "center";
			this.statusContext.fillText("1UP", (this.model.maze.xmax*TILE_SIZE/4)*this.scale,(TILE_SIZE+TILE_SIZE/3)*this.scale);
			this.statusContext.closePath();									
		}
		this.statusContext.beginPath();
		this.statusContext.textAlign = "right";
		this.statusContext.fillText(this.model.puckman.score,  (this.model.maze.xmax*TILE_SIZE/4)*this.scale,(2*TILE_SIZE+TILE_SIZE/3)*this.scale);
		this.statusContext.closePath();									

		/**PLAYER LIFE*/
		this.statusContext.beginPath();
		for(var il=0;il<this.model.puckman.life;il++){
			this.drawSprite(this.statusContext, "PUCKMAN_"+LEFT,(il+1)*ACTOR_SIZE*this.scale, (this.model.maze.ymax*TILE_SIZE-ACTOR_SIZE-TILE_SIZE/5)*this.scale);	
		}
		this.statusContext.closePath();									
	};
	
	this.drawActors=function(){
		this.drawBalls();
		this.drawPuckman();
		this.drawGhosts();
	};

	this.drawBalls=function(){
		for(var bi in this.model.balls){
			var ball = this.model.balls[bi];

			if(!ball.isEaten){
				var spriteName="BALL";
				if(ball.isEnergizer){spriteName="SUPERBALL";}	
				
				if(this.model.time % 20 < 15){spriteName=spriteName+ANIM1;		
				}else{spriteName=spriteName+ANIM2;}
				
				this.drawSprite(this.actorContext, spriteName,ball.x*TILE_SIZE*this.scale, ball.y*TILE_SIZE*this.scale);
			}
		}
	};

	this.drawGhostTarget=function(ghost){
		var ghostColors={BLINKY:"255,64,64",PINKY:"255,128,255",INKY:"128,255,255",CLYDE:"255,128,64"};
		var ghostColor="rgba("+ghostColors[ghost.name]+",0.4)";

		this.actorContext.beginPath();
		this.actorContext.rect(ghost.target.x*TILE_SIZE*this.scale, ghost.target.y*TILE_SIZE*this.scale, TILE_SIZE*this.scale, TILE_SIZE*this.scale);
		this.actorContext.fillStyle = ghostColor;
		this.actorContext.fill();
		this.actorContext.closePath();									
	};
	
	this.drawGhosts=function(){
		for(var gi in this.model.ghosts){
			var ghost = this.model.ghosts[gi];

			var spriteName=ghost.name;
			var isFrighten=ghost.status==FRIGHTENED&&(this.model.frightTime>80||this.model.time % 20 < 10);
			if(ghost.isEaten){spriteName="GHOST_EATEN";				
			}else if(isFrighten){spriteName="GHOST_"+FRIGHTENED;}
			if(this.model.time % 20 < 10){spriteName=spriteName+ANIM1;
			}else{spriteName=spriteName+ANIM2;}
			if(!ghost.isEaten&&!isFrighten){spriteName=spriteName+"_"+ghost.direction;}
			
			this.drawSprite(this.actorContext, spriteName, (ghost.x*TILE_SIZE+ghost.offset.x-ACTOR_SIZE/2)*this.scale, (ghost.y*TILE_SIZE+ghost.offset.y-ACTOR_SIZE/2)*this.scale);
			
			if(this.displayTarget){this.drawGhostTarget(ghost);}
		}
	};

	this.drawPuckman=function(){
		var puckman = this.model.puckman;
		
		var spriteName="PUCKMAN_";
		
		if(this.model.time % 20 < 10 || puckman.isEaten){
			spriteName=spriteName+NONE;		
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
		var angleDirections = {NONE:-1,LEFT:180,RIGHT:0,UP:270,DOWN:90};

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
		var aBallColor="rgba("+ballcolor+",0.3)";
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
		//GHOST
		//var ghostNames=new Array(BLINKY,PINKY,INKY,CLYDE);
		var ghostColors={BLINKY:"255,64,64",PINKY:"255,128,255",INKY:"128,255,255",CLYDE:"255,128,64"};
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
					spriteContext.arc(    (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale,(y*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale, ghostradius, (Math.PI / 180) * (180), 0, false);
					spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale +ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
					spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
					spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale);
					spriteContext.moveTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
					spriteContext.fill();
					spriteContext.closePath();
					
					spriteContext.beginPath();
					spriteContext.fillStyle = "#FFFFFF";
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/4, 0, (Math.PI / 180) * (360), false);
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/4, 0, (Math.PI / 180) * (360), false);
					spriteContext.fill();
					spriteContext.closePath();
					
					//EYES
					spriteContext.beginPath();
					spriteContext.fillStyle = "#000000";
					var eyesSize=ghostradius/6;
					switch(directions[di]){
						case NONE:
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, eyesSize, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, eyesSize, 0, (Math.PI / 180) * (360), false);
							break;
						case LEFT:
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3-ghostradius/8, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, eyesSize, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3-ghostradius/8, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, eyesSize, 0, (Math.PI / 180) * (360), false);
							break;
						case RIGHT:
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3+ghostradius/8, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, eyesSize, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3+ghostradius/8, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, eyesSize, 0, (Math.PI / 180) * (360), false);
							break;
						case UP:
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale-ghostradius/8, eyesSize, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale-ghostradius/8, eyesSize, 0, (Math.PI / 180) * (360), false);
							break;
						case DOWN:
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale+ghostradius/8, eyesSize, 0, (Math.PI / 180) * (360), false);
							spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale+ghostradius/8, eyesSize, 0, (Math.PI / 180) * (360), false);
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
			spriteContext.arc(    (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale, ghostradius, (Math.PI / 180) * (180), 0, false);
			spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale +ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
			spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
			spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale);
			spriteContext.moveTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
			spriteContext.fill();
			spriteContext.closePath();
			
			
			//EYES
			spriteContext.beginPath();
			spriteContext.fillStyle = "#FFFFFF";
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/4, 0, (Math.PI / 180) * (360), false);
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/4, 0, (Math.PI / 180) * (360), false);
			spriteContext.fill();
			spriteContext.closePath();
			spriteContext.beginPath();
			spriteContext.fillStyle = "#000000";
			switch(ghostSpriteAnims[ai]){
				case ANIM1:
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/8, 0, (Math.PI / 180) * (360), false);
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/8, 0, (Math.PI / 180) * (360), false);
					break;
				case ANIM2:
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/12, 0, (Math.PI / 180) * (360), false);
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/3, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/12, 0, (Math.PI / 180) * (360), false);
					break;
			}			
			spriteContext.fill();
			spriteContext.closePath();
			
			//MOUTH
			var begMouthx=(x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/14;
			var endMouthx=(x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/14;
			var mouthWidthIn=ghostradius/3;
			var mouthWidthLips=ghostradius/1.5;
			switch(ghostSpriteAnims[ai]){
				case ANIM1:
					begMouthx=(x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/6;
					endMouthx=(x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/6;
					mouthWidthIn=ghostradius/20;
					mouthWidthLips=ghostradius/3;

					break;
				case ANIM2:
					begMouthx=(x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/4;
					endMouthx=(x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/4;
					mouthWidthIn=ghostradius/3;
					mouthWidthLips=ghostradius/1.5;
					break;
			}			
			spriteContext.beginPath();
			spriteContext.strokeStyle = "#FFFFFF";
			spriteContext.lineWidth = mouthWidthLips;
			spriteContext.moveTo(begMouthx, (y*ACTOR_SIZE+ACTOR_SIZE*1.9/3)*this.scale);
			spriteContext.lineTo(endMouthx, (y*ACTOR_SIZE+ACTOR_SIZE*1.9/3)*this.scale);
			spriteContext.lineCap = "round";
			spriteContext.stroke();
			spriteContext.closePath();
			spriteContext.beginPath();
			spriteContext.strokeStyle = "#aa0000";
			spriteContext.lineWidth = mouthWidthIn;
			spriteContext.moveTo(begMouthx, (y*ACTOR_SIZE+ACTOR_SIZE*1.9/3)*this.scale);
			spriteContext.lineTo(endMouthx, (y*ACTOR_SIZE+ACTOR_SIZE*1.9/3)*this.scale);
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
			
			var spriteName="GHOST_"+FRIGHTENED+ghostSpriteAnims[ai];
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
			spriteContext.arc(    (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale, (y*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale, ghostradius, (Math.PI / 180) * (180), 0, false);
			spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale +ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
			spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
			spriteContext.lineTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale);
			spriteContext.moveTo( (x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale -ghostradius,(y*ACTOR_SIZE+ACTOR_SIZE*3/4)*this.scale);
			spriteContext.fill();
			spriteContext.closePath();			
			
			//EYES
			spriteContext.beginPath();
			spriteContext.fillStyle = "#FFFFFF";
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/5, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/3, 0, (Math.PI / 180) * (360), false);
			spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/5, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/3, 0, (Math.PI / 180) * (360), false);
			spriteContext.fill();
			spriteContext.closePath();
			spriteContext.beginPath();
			spriteContext.fillStyle = "#000000";
			switch(ghostSpriteAnims[ai]){
				case ANIM1:
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/5, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/8, 0, (Math.PI / 180) * (360), false);
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/5, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/8, 0, (Math.PI / 180) * (360), false);
					break;
				case ANIM2:
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale-ghostradius/5, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/12, 0, (Math.PI / 180) * (360), false);
					spriteContext.arc((x*ACTOR_SIZE+ACTOR_SIZE/2)*this.scale+ghostradius/5, (y*ACTOR_SIZE+ACTOR_SIZE*1/3)*this.scale, ghostradius/12, 0, (Math.PI / 180) * (360), false);
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
		this.statusContext.clearRect(0, 0, this.statusCanvas.width, this.statusCanvas.height);		
		/** Draw */
		this.drawActors();
		this.drawStatus();
		
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
	
	this.start=function(){
		if(this.model.start()){this.puckmanDirection=NONE;}
	};
};