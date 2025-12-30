/* IBNIZ-js 0.C - A JavaScript implementation of IBNIZ
 * This program is free software. It comes without any warranty, to
 * the extent permitted by applicable law. You can redistribute it
 * and/or modify it under the terms of the Do What The Fuck You Want
 * To Public License, Version 2, as published by Sam Hocevar. See
 * http://sam.zoy.org/wtfpl/COPYING for more details. */

(function(factory) {
  if (typeof module != 'undefined' && typeof module.exports != 'undefined') {
    module.exports = factory()
  }
  else {
    window.jibniz = factory()
  }
}(function() {

  'use strict'

  // Array extensions for stack operations
  Array.prototype.clear = function(){
    this.length=0;
  }
  Array.prototype.exchange = function(){
    if(this.length<2) return -1;
    var temp = this[this.length-1];
    this[this.length-1]=this[this.length-2];
    this[this.length-2]=temp;
  }
  Array.prototype.trirot = function(){
    if(this.length<3) return -1;
    var temp = this[this.length-1];
    this[this.length-1]=this[this.length-3];
    this[this.length-3]=this[this.length-2];
    this[this.length-2]=temp;
  }
  Array.prototype.trirot2 = function(){
    if(this.length<3) return -1;
    var temp = this[this.length-2];
    this[this.length-2]=this[this.length-3];
    this[this.length-3]=this[this.length-1];
    this[this.length-1]=temp;
  }
  Array.prototype.get = function(addr) {
    return this[addr];
  }
  Array.prototype.gettop = function(addr) {
    return this[this.length-1+addr];
  }
  Array.prototype.put = function(addr,v) {
    this[addr]=v|0;
  }
  Array.prototype.puttop = function(addr,v) {
    this[this.length-1+addr]=v|0;
  }
  Array.prototype.dup = function(){
    this.push(this[this.length-1]);
  }
  Array.prototype.dpush = function(v){
    this.push(v|0);
  }

  function Parser(simpleGetPut,useAudio)
  {
    this.code = "";
    this.parsedCode = new Array();
    this.ip = 0;
    this.t = 0;
    this.x = 0;
    this.y = 0;
    this.xy = 0;
    this.mode = 0;
    this.terminate = 0;
    this.stackmode = 0;
    this.videoout = 0;
    this.audioout = 0;
    this.stacka = new Array();
    this.rstacka = new Array();
    this.mem = new Array(1048576);
    // 0xC8000-0xCFFFF - return stacks
    // 0xD0000-0xFFFFF - stacks
    this.shl = function(a,b){
      var steps = (a>>16)&63;
      return steps<32 ? b<<steps : b>>(steps-32);
    }
    this.rol = function(a,b){
      var steps = (a>>16)&31;
      return ((b<<steps)|(b>>>(32-steps)));
    }
    this.ror = function(a,b){
      var steps = (a>>16)&31;
      return ((b>>>steps)|(b<<(32-steps)));
    }
    this.config = function(simpleGetPut,useAudio,recalcAudio)
    {
      this.useAudio=useAudio;
      this.recalcAudio=recalcAudio;
      if(simpleGetPut)
      {
        this.get = function(addr) { return this.mem[addr]; }
        this.put = function(addr,val) { this.mem[addr]=val; }
      }
      else
      {
        this.get = function(addr,val){
          switch(addr>>15)
          {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            case 20:
            case 21:
            case 22:
            case 23:
            case 24:
              return this.mem[addr];
              break;
            case 25:
              return this.rstacka[addr&0x3FFF];
              break;
            case 26:
            case 27:
              return this.stacka[addr&0xFFFF];
              break;
            case 28:
            case 29:
            case 30:
            case 31:
              return this.stacka[addr&0x1FFFF];
              break;
          }
        }
        this.put = function(addr,val){
          switch(addr>>15)
          {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
            case 8:
            case 9:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 15:
            case 16:
            case 17:
            case 18:
            case 19:
            case 20:
            case 21:
            case 22:
            case 23:
            case 24:
              this.mem[addr] = val;
              break;
            case 25:
              this.rstacka.put(addr&0x3FFF,val);
              break;
            case 26:
            case 27:
              this.stacka.put(addr&0xFFFF,val);
              break;
            case 28:
            case 29:
            case 30:
            case 31:
              this.stacka.put(addr&0x1FFFF,val);
              break;
          }
        }
      }
    }
    this.config(simpleGetPut,useAudio);
    this.load = function(c)
    {
      this.code=c;
      this.parsedCode = new Array();
      this.compile();
      this.configureStackmode();
    }
    this.rol16 = function(b){
      return ((b<<16)|(b>>>16));
    }
    this.compiledpm = function(x,y){}
    this.pm0 = function() { this.stacka.push(this.t<<16,0,0); };
    this.pushmedia = function(x,y)
    {
      if(this.mode==0) this.compiledpm(x,y);
      else this.stacka.push(this.t<<16 | (y<<8) | x);
    }
    this.pmaudio = function(x,y)
    {
      this.stacka.push(this.t*65536 + (y<<8) + x);
    }
    this.compilepushmedia = function()
    {
      switch(this.stackmode)
      {
        case 0:
          this.compiledpm = function(x,y) { this.stacka.push(this.t<<16,(y<<9)-65536,(x<<9)-65536); };
          break;
        case 1:
          this.compiledpm = function(x,y) { this.stacka.push(this.t<<16 | (y<<8) | x); };
          break;
      }
    }
    this.run = function(x,y)
    {
      // reset the machine
      this.mode = 0;
      this.terminate = 0;
      this.stacka.length=0;
      this.ip = 0;
      // push media context
      this.compiledpm(x,y);
      // loop
      this.mediaSwitch=true;
      this.exec(x,y);
      if(this.mode==0)
      {
        // run audio, too
        this.videoout = this.stacka.pop();
        if((this.useFFAudio || this.useChromeAudio) && this.useAudio)
        {
          if(this.stackmode==1 && !this.recalcAudio)
            this.audioout=this.videoout; // same stack data, skip the processing bulk
          else if((x%128)==0 && this.recalcAudio)
          {
            this.mode=1;
            this.terminate = 0;
            this.stacka.length=0;
            this.ip = 0;
            this.pmaudio(x,y);
            this.exec(x,y);
          }
        }
      }
      if((this.useFFAudio || this.useChromeAudio) && this.useAudio && this.mode==1) this.audioout = this.stacka.pop();
    }
    this.isLimm = function(ci)
    {
      // is 0-9? A-F? .?
      return ((ci>=48 && ci<=57) || (ci>=65 && ci<=70) || (ci==46));
    }
    this.isImmop = function(ci)
    {
      return ((ci>=112 && ci<=115)||ci==43||ci==45||ci==42||ci==47||ci==37||ci==38||ci==124||ci==94||ci==108||ci==126||ci==97||ci==100||ci==40||ci==41||ci==74||ci==33||ci==64||ci==86||ci==88||ci==80||ci==123);
    }
    this.isOpcode = function(ci)
    {
      return (this.isImmop(ci) || this.isLimm(ci) || ci==77||(ci>=118&&ci<=120)||ci==63||ci==58||ci==59||ci==82||ci==84||ci==105||ci==106||ci==91||ci==93||ci==76||ci==125);
    }
    this.parse = function()
    {
      var i = 0;
      var j = 0;
      while(i<this.code.length)
      {
        var a = this.code[i].charCodeAt(0);
        if(this.isLimm(a))
        {
          // Loadimm!
          var imm1 = 0; // number
          var imm2 = 0; // fraction
          var imm2_c = 12;
          var mode = 0; // number/fraction time?
          while(this.isLimm(a) && i<this.code.length)
          {
            if(a==46) mode=1; // dot, time to switch modes!
            else {
              if(mode==0)
              {
                if(a>=48 && a<=57) imm1=(imm1<<4)|(a-48); // number, 0-9
                else imm1=(imm1<<4)|(a-55); // fraction, A-F
              }
              else if(imm2_c>0)
              {
                if(a>=48 && a<=57) imm2=imm2|((a-48)<<imm2_c); // fraction, 0-9
                else imm2=imm2|((a-55)<<imm2_c); // fraction, A-F
                imm2_c-=4;
              }
            }
            i++; // increment IP
            if(i<this.code.length) a = this.code[i].charCodeAt(0); // char->int (checks for ip overrun)
          }
          if(i<this.code.length) a = this.code[i].charCodeAt(0);
          else a=0;
          var out = ((imm1&65535)<<16)|(imm2&65535);
          if(this.isImmop(a))
          {
            switch(a)
            {
              case 115:
                this.parsedCode[j] = new Array(2,Math.sin(out*(Math.PI/32768))*65536);
                break;
              case 113:
                this.parsedCode[j] = new Array(2,0 > out ? 0 : 65536 * Math.sqrt(out / 65536));
                break;
              case 126:
                this.parsedCode[j] = new Array(2,~out);
                break;
              case 123:
                this.parsedCode[j] = new Array(5,this.rol16(out)&1048575,123,0);
                break;
              case 40:
              case 41:
                this.parsedCode[j] = new Array(3,0-this.rol16(out),a);
                break;
              case 74:
              case 86:
                this.parsedCode[j] = new Array(3,this.rol16(out),a);
                break;
              case 64:
                var addr = this.rol16(out)&1048575;
                if(addr<0xC8000) this.parsedCode[j] = new Array(3,addr,128);
                else this.parsedCode[j] = new Array(3,addr,a);
                break;
              case 33:
                var addr = this.rol16(out)&1048575;
                if(addr<0xC8000) this.parsedCode[j] = new Array(3,addr,129);
                else this.parsedCode[j] = new Array(3,addr,a);
                break;
              default:
                this.parsedCode[j] = new Array(3,out,a);
                break;
            }
            i++;
          }
          else this.parsedCode[j] = new Array(2,out);
          j++;
        }
        else if(this.isOpcode(a))
        {
          switch(a)
          {
            case 125:
              var t = j;
              var chr = 0;
              while(chr!=123 && t>=0)
              {
                t--;
                if(this.parsedCode[t] && this.parsedCode[t][0]==1) chr = this.parsedCode[t][1];
                else if(this.parsedCode[t] && this.parsedCode[t][0]==5) chr = this.parsedCode[t][2];
              }
              if(t>=0)
              {
                if(this.parsedCode[t] && this.parsedCode[t][0]==5)
                  this.parsedCode[t] = new Array(5,this.parsedCode[t][1],chr,j);
                else this.parsedCode[t] = new Array(4,chr,j);
              }
              this.parsedCode[j] = new Array(1,a);
              break;
            case 58:
              var t = j;
              var chr = 0;
              while(chr!=63 && t>=0)
              {
                t--;
                if(this.parsedCode[t] && this.parsedCode[t][0]==1) chr = this.parsedCode[t][1];
              }
              if(t>=0) this.parsedCode[t] = new Array(4,chr,j);
              this.parsedCode[j] = new Array(1,a);
              break;
            case 59:
              var t = j;
              var chr = 0;
              while(chr!=58 && t>=0)
              {
                t--;
                if(this.parsedCode[t] && this.parsedCode[t][0]==1) chr = this.parsedCode[t][1];
              }
              if(t>=0) this.parsedCode[t] = new Array(4,chr,j);
              this.parsedCode[j] = new Array(1,a);
              break;
            case 118:
              this.parsedCode[j] = new Array(1,a);
              if(i+1<this.code.length)
              {
                var b = this.code[i+1].charCodeAt(0);
                if(b==118)
                {
                  this.parsedCode[j] = new Array(1,128);
                  i++;
                }
              }
              break;
            default:
              this.parsedCode[j] = new Array(1,a);
              break;
          }
          i++;
          j++;
        }
        else i++;
      }
    }
    this.compile = function()
    {
      var i = 0;
      var oldCode = this.parsedCode;
      this.parse();
      this.evals = new Array();
      this.evals[0] = function(){};
      while(i<oldCode.length)
      {
        this.evaluate(i);
        this.evals[i] = this.evalCode;
        i++;
      }
      this.parsedCode = oldCode;
    }
    this.evalRol16 = function(a)
    {
      return "((" + a + "<<16)|(" + a + ">>>16))";
    }
    this.evaluate = function(startIP)
    {
      var tempCode = "";
      var cmd;
      var a;
      tempCode += "var a; var stacka = me.stacka; var steps;";
      for(this.ip=startIP; this.ip<this.parsedCode.length; this.ip++)
      {
        cmd = this.parsedCode[this.ip];
        switch(cmd[0])
        {
          case 1: // op
            switch(cmd[1])
            {
              // Math!
              case 43:
                tempCode += "stacka.push((stacka.pop()+stacka.pop())|0);";
                break;
              case 45:
                tempCode += "a = stacka.pop(); stacka.push((stacka.pop()-a)|0);";
                break;
              case 42:
                tempCode += "stacka.push((stacka.pop()*stacka.pop()/65536)|0);";
                break;
              case 47:
                tempCode += "a = stacka.pop(); stacka.push((stacka.pop()*65536/a)|0);";
                break;
              case 37:
                tempCode += "a = stacka.pop(); stacka.push(stacka.pop()%a);";
                break;
              case 38:
                tempCode += "stacka.push(stacka.pop()&stacka.pop());";
                break;
              case 124:
                tempCode += "stacka.push(stacka.pop()|stacka.pop());";
                break;
              case 94:
                tempCode += "stacka.push(stacka.pop()^stacka.pop());";
                break;
              case 108:
                tempCode += "steps = (stacka.pop()>>16)&63; a = stacka.pop(); stacka.push(steps<32 ? a<<steps : a>>(steps-32));";
                break;
              case 114:
                tempCode += "steps = (stacka.pop()>>16)&31; a = stacka.pop(); stacka.push((a>>>steps)|(a<<(32-steps)));";
                break;
              case 97:
                tempCode += "stacka.push((Math.atan2(stacka.pop(),stacka.pop())*"+(65536/(2*Math.PI))+")|0);";
                break;
              case 115:
                tempCode += "stacka.push((Math.sin(stacka.pop()*"+(2*Math.PI/65536)+")*65536)|0);";
                break;
              case 113:
                tempCode += "a = stacka.pop(); stacka.push(0 > a ? 0 : (65536 * Math.sqrt(a / 65536))|0);";
                break;
              case 60:
                tempCode += "a = stacka.pop(); stacka.push(0 > a ? a : 0);";
                break;
              case 62:
                tempCode += "a = stacka.pop(); stacka.push(0 < a ? a : 0);";
                break;
              case 61:
                tempCode += "stacka.push(stacka.pop()==0);";
                break;
              case 126:
                tempCode += "stacka.push(~stacka.pop());";
                break;
              // Exterior!
              case 77: // media context switch
                tempCode += "if(!me.mediaSwitch || !me.useAudio) return -15498; ";
                tempCode += "else{me.mode=1; me.videoout = stacka.pop(); stacka.length=0;";
                tempCode +=	"me.pmaudio(x,y);}";
                break;
              case 119: // where am I? well, where are you
                tempCode +=	"me.pushmedia(x,y);";
                break;
              case 84:
                tempCode +=	"return -15498;";
                break;
              // Stack!
              case 100:
                tempCode +=	"stacka.dup();";
                break;
              case 120:
                tempCode +=	"stacka.exchange();";
                break;
              case 118:
                tempCode +=	"stacka.trirot();";
                break;
              case 112:
                tempCode +=	"stacka.pop();";
                break;
              case 41:
                tempCode +=	"stacka.push(stacka.gettop(0-me.rol16(stacka.pop())));";
                break;
              case 40:
                tempCode +=	"a = 0-me.rol16(stacka.pop()); stacka.puttop(a,stacka.pop());";
                break;
              // Memory!
              case 64:
                tempCode +=	"stacka.push(me.get(me.rol16(stacka.pop())&1048575));";
                break;
              case 33:
                tempCode +=	"a = me.rol16(stacka.pop()); me.put(a&1048575,stacka.pop());";
                break;
              // Return stack manipulation
              case 82:
                tempCode +=	"stacka.push(me.rstacka.pop());";
                break;
              case 80:
                tempCode +=	"me.rstacka.push(stacka.pop());";
                break;
              // Loops
              case 105:
                tempCode +=	"stacka.push(me.rstacka.gettop(-1));";
                break;
              case 106:
                tempCode +=	"stacka.push(me.rstacka.gettop(-3));";
                break;
              case 74:
                tempCode +=	"return me.rol16(stacka.pop())-1;";
                break;
              case 91:
                tempCode +=	"me.rstacka.push("+this.rol16(this.ip+1)+");";
                break;
              case 93:
                tempCode +=	"if(stacka.pop()!=0) return me.rol16(me.rstacka.gettop(0))-1; ";
                tempCode += "else me.rstacka.pop();";
                break;
              case 88:
                tempCode += "me.rstacka.push(stacka.pop());";
                tempCode += "me.rstacka.push("+this.rol16(this.ip+1)+");";
                break;
              case 76:
                tempCode +=	"a=me.rstacka.gettop(-1)-(1<<16);";
                tempCode +=	"me.rstacka.puttop(-1,a);";
                tempCode +=	"if(a) return me.rol16(me.rstacka.gettop(0))-1;";
                tempCode +=	"else { me.rstacka.pop(); me.rstacka.pop(); }";
                break;
              // Subroutines
              case 125:
                tempCode +=	"return me.rol16(me.rstacka.pop())-1;";
                break;
              case 86:
                tempCode += "me.rstacka.push("+this.rol16(this.ip+1)+");";
                tempCode += "return me.rol16(me.get(me.rol16(stacka.pop())&1048575))-1;";
                break;
              // Special
              case 128: // Double trirot
                tempCode += "stacka.trirot2();";
                break;
              default:
                break;
            }
            break;
          case 5: // imm+op+nextip
            switch(cmd[2])
            {
              case 123:
                tempCode += "me.put(" + cmd[1] + ","+this.rol16(this.ip+1)+");";
                this.ip=cmd[3];
                break;
            }
            break;
          case 4: // op+nextip
            switch(cmd[1])
            {
              case 123:
                tempCode += "me.put(me.rol16(stacka.pop())&1048575,"+this.rol16(this.ip+1)+");";
                this.ip=cmd[2];
                break;
              case 63:
                tempCode += "if(stacka.pop()==0) return " + cmd[2] + ";";
                break;
              case 58:
                this.ip=cmd[2];
                break;
            }
            break;
          case 3: // imm+op
            switch(cmd[2])
            {
              case 43:
                tempCode += "stacka.push(("+cmd[1]+"+stacka.pop())|0);";
                break;
              case 45:
                tempCode += "stacka.push((stacka.pop()-"+cmd[1]+")|0);";
                break;
              case 42:
                tempCode += "stacka.push((("+cmd[1]+"*stacka.pop())/65536)|0);";
                break;
              case 47:
                tempCode += "stacka.push(((stacka.pop()*65536)/"+cmd[1]+")|0);";
                break;
              case 37:
                tempCode += "stacka.push(stacka.pop()%"+cmd[1]+");";
                break;
              case 38:
                tempCode += "stacka.push("+cmd[1]+"&stacka.pop());";
                break;
              case 124:
                tempCode += "stacka.push("+cmd[1]+"|stacka.pop());";
                break;
              case 94:
                tempCode += "stacka.push("+cmd[1]+"^stacka.pop());";
                break;
              case 108:
                tempCode += "stacka.push(me.shl("+cmd[1]+",stacka.pop()));";
                break;
              case 114:
                tempCode += "stacka.push(me.ror("+cmd[1]+",stacka.pop()));";
                break;
              case 97:
                tempCode += "stacka.push((Math.atan2("+cmd[1]+",stacka.pop())*"+(65536/(2*Math.PI))+")|0);";
                break;
              case 115:
                tempCode += "stacka.push("+((Math.sin(cmd[1]*(Math.PI/32768))*65536)|0)+");";
                break;
              case 113:
                tempCode += "stacka.push("+(0 > cmd[1] ? 0 : (65536 * Math.sqrt(cmd[1] / 65536))|0)+");";
                break;
              case 126:
                tempCode += "stacka.push("+(~cmd[1])+");";
                break;
              case 100:
                tempCode += "stacka.push("+cmd[1]+","+cmd[1]+");";
                break;
              case 40:
                tempCode += "stacka.puttop("+cmd[1]+",stacka.pop());";
                break;
              case 41:
                tempCode += "stacka.push(stacka.gettop("+cmd[1]+"));";
                break;
              case 74:
                tempCode += "return "+cmd[1]+";";
                break;
              case 64:
                tempCode += "stacka.push(me.get("+cmd[1]+"));";
                break;
              case 33:
                tempCode += "me.put("+cmd[1]+",stacka.pop());";
                break;
              case 86:
                tempCode += "me.rstacka.push("+this.rol16(this.ip+1)+");";
                tempCode += "return me.rol16(me.get("+cmd[1]+"))-1;";
                break;
              case 88:
                tempCode += "me.rstacka.push("+cmd[1]+");";
                tempCode += "me.rstacka.push("+this.rol16(this.ip+1)+");";
                break;
              case 80:
                tempCode += "me.rstacka.push("+cmd[1]+");";
                break;
              case 112:
                break;
              // special
              case 128: // direct load
                tempCode += "stacka.push(me.mem["+cmd[1]+"]);";
                break;
              case 129: // direct store
                tempCode += "me.mem["+cmd[1]+"]=stacka.pop();";
                break;
            }
            break;
          case 2: // imm
            tempCode += "stacka.push("+cmd[1]+");";
            break;
          default:
            break;
        }
      }
      eval("this.evalCode = function(me,x,y) {" + tempCode + " return -15498;};");
    }
    this.mediaSwitch=true;
    this.configureStackmode = function()
    {
      // reset the machine
      this.mode = 0;
      this.stackmode = 0;
      this.terminate = 0;
      this.stacka.length=0;
      this.ip = 0;
      // push media context
      this.pm0();
      // loop
      this.mediaSwitch=false;
      this.exec(0,0);
      if(this.stacka.length>1) this.stackmode = 1;
      this.compilepushmedia();
    }
    this.getOp = function(ip)
    {
      var cmd = this.parsedCode[this.ip];
      if(cmd[0]==1 || cmd[0]==4) return cmd[1];
      else if(cmd[0]==3) return cmd[2];
      else return 0;
    }
    this.exec = function(x,y)
    {
      while(this.ip>=0 && this.ip<this.parsedCode.length)
        this.ip = this.evals[this.ip](this,x,y)+1;
    }
    this.useFFAudio = false;
    this.useChromeAudio = false;
    this.recalcAudio = false;
    this.buffer = new Array(512);

    // Initialize audio
    if(typeof Audio !== 'undefined')
    {
      this.audioOut = new Audio();
      if(this.audioOut.mozSetup)
      {
        this.audioOut.mozSetup(1,512*60);
        this.useFFAudio = true;
        this.buffer = new Float32Array(512);
      }
    }
    if(typeof webkitAudioContext !== 'undefined')
    {
      this.audioCtx = new webkitAudioContext();
      this.audioSR = this.audioCtx.sampleRate/60;
      this.useChromeAudio = true;
      this.buffer = new Float32Array(512);
    }

    this.render = function(c)
    {
      var idd = c.createImageData(256,256);
      var id = idd.data;
      var imgpos = 0;
      var cy = 0;
      var cu = 0;
      var cv = 0;
      for(var y=0;y<256;y++)
      {
        for(var x=0;x<256;x++)
        {
          this.run(x,y);
          cy = (this.videoout>>>8)&255;
          cu = (((this.videoout>>>16)&255)^0x80)-128;
          cv = ((this.videoout>>>24)^0x80)-128;
          id[imgpos++] = (298*cy + 409*cv + 128)>>8;
          id[imgpos++] = (298*cy - 100*cu - 208*cv + 128)>>8;
          id[imgpos++] = (298*cy + 516*cu + 128)>>8;
          id[imgpos++] = 255;
          this.buffer[(y<<1)] = (((this.audioout&65535)^32768)-32768)/32768;
        }
      }
      c.putImageData(idd,0,0);
      this.renderAudio();
    }

    this.render2 = function(c)
    {
      var idd = c.createImageData(128,128);
      var id = idd.data;
      var imgpos = 0;
      var cy = 0;
      var cu = 0;
      var cv = 0;
      for(var y=0;y<256;y+=2)
      {
        for(var x=0;x<256;x+=2)
        {
          this.run(x,y);
          cy = (this.videoout>>>8)&255;
          cu = (((this.videoout>>>16)&255)^0x80)-128;
          cv = ((this.videoout>>>24)^0x80)-128;
          id[imgpos++] = (298*cy + 409*cv + 128)>>8;
          id[imgpos++] = (298*cy - 100*cu - 208*cv + 128)>>8;
          id[imgpos++] = (298*cy + 516*cu + 128)>>8;
          id[imgpos++] = 255;
          this.buffer[(y<<1)] = (((this.audioout&65535)^32768)-32768)/32768;
        }
      }
      c.putImageData(idd,0,0);
      this.renderAudio();
    }

    this.renderAudio = function()
    {
      if(this.useFFAudio) this.audioOut.mozWriteAudio(this.buffer);
      else if(this.useChromeAudio)
      {
        if(this.audioOut.noteOff) this.audioOut.noteOff(0);
        this.fixbuffer = new Float32Array(this.audioSR);
        for(var i=0;i<this.audioSR;i++)
        {
          var t1 = i*512/this.audioSR;
          var t2 = t1-Math.floor(t1);
          this.fixbuffer[i]=this.buffer[Math.floor(t1)]*(1-t2)+this.buffer[Math.ceil(t1)]*t2;
        }
        this.aBuffer = this.audioCtx.createBuffer(1,this.audioSR,this.audioSR*60);
        this.aBuffer.getChannelData(0).set(this.fixbuffer);
        this.audioOut = this.audioCtx.createBufferSource();
        this.audioOut.buffer=this.aBuffer;
        this.audioOut.connect(this.audioCtx.destination);
        this.audioOut.noteOn(0);
        this.audioOut.loop = true;
      }
    }

    this.delayAudio = function(a)
    {
      if(this.useFFAudio) for(var b=0; b<a; b++) this.audioOut.mozWriteAudio(this.buffer);
    }
  }

  // Console wrapper class for compatibility
  class Console {
    constructor(canvas) {
      this.domElement = canvas || document.createElement('canvas')
      this.domElement.width = window.innerWidth || 800
      this.domElement.height = window.innerHeight || 600

      this.ctx = this.domElement.getContext('2d')
      this.parser = new Parser(false, false)

      this.running = false
      this.time = 0
      this.fps = 0
      this.mode = 'TYX'
      this.highQuality = false

      // Calculate optimal resolution based on viewport size
      this.calculateResolution()

      // Create high-resolution offscreen canvas
      this.offscreenCanvas = document.createElement('canvas')
      this.offscreenCanvas.width = this.renderWidth
      this.offscreenCanvas.height = this.renderHeight
      this.offscreenCtx = this.offscreenCanvas.getContext('2d')

      // Disable image smoothing for crisp pixels when needed
      this.ctx.imageSmoothingEnabled = true
      this.ctx.imageSmoothingQuality = 'high'
    }

    calculateResolution() {
      const maxDimension = Math.max(this.domElement.width, this.domElement.height)

      if (!this.highQuality) {
        // Low quality mode - always use 256x256
        this.renderWidth = this.renderHeight = 256
        return
      }

      // High quality mode - scale resolution based on viewport
      if (maxDimension > 1920) {
        this.renderWidth = this.renderHeight = 1024
      } else if (maxDimension > 1280) {
        this.renderWidth = this.renderHeight = 768
      } else if (maxDimension > 800) {
        this.renderWidth = this.renderHeight = 512
      } else {
        this.renderWidth = this.renderHeight = 256
      }
    }

    // Custom high-resolution render function
    renderHighRes() {
      const imageData = this.offscreenCtx.createImageData(this.renderWidth, this.renderHeight)
      const data = imageData.data

      let imgpos = 0
      const scaleX = 256 / this.renderWidth
      const scaleY = 256 / this.renderHeight

      for (let y = 0; y < this.renderHeight; y++) {
        for (let x = 0; x < this.renderWidth; x++) {
          // Map high-res coordinates back to IBNIZ 256x256 space
          const ibnizX = Math.floor(x * scaleX)
          const ibnizY = Math.floor(y * scaleY)

          // Run IBNIZ for this coordinate
          this.parser.run(ibnizX, ibnizY)

          // Convert YUV to RGB
          const cy = (this.parser.videoout >>> 8) & 255
          const cu = (((this.parser.videoout >>> 16) & 255) ^ 0x80) - 128
          const cv = ((this.parser.videoout >>> 24) ^ 0x80) - 128

          const r = Math.max(0, Math.min(255, (298 * cy + 409 * cv + 128) >> 8))
          const g = Math.max(0, Math.min(255, (298 * cy - 100 * cu - 208 * cv + 128) >> 8))
          const b = Math.max(0, Math.min(255, (298 * cy + 516 * cu + 128) >> 8))

          data[imgpos++] = r
          data[imgpos++] = g
          data[imgpos++] = b
          data[imgpos++] = 255 // alpha

          // Handle audio buffer
          if (y < 256 && x === 0) {
            this.parser.buffer[y << 1] = (((this.parser.audioout & 65535) ^ 32768) - 32768) / 32768
          }
        }
      }

      this.offscreenCtx.putImageData(imageData, 0, 0)
      this.parser.renderAudio()
    }

    async init() {
      // Initialize with default code
      this.parser.load('*')
      return Promise.resolve()
    }

    install(program) {
      this.parser.load(program.code)
    }

    run() {
      if (this.running) return

      this.running = true
      this.start = performance.now()
      this.lastFrame = this.start

      const step = () => {
        if (!this.running) return

        requestAnimationFrame(step)

        const now = performance.now()
        const dt = (now - this.lastFrame) / 1000
        this.lastFrame = now

        this.fps = Math.round(1 / dt)

        // Render IBNIZ at high resolution
        this.renderHighRes()

        // Scale to full canvas with high quality
        this.ctx.clearRect(0, 0, this.domElement.width, this.domElement.height)
        this.ctx.drawImage(
          this.offscreenCanvas,
          0, 0, this.renderWidth, this.renderHeight,
          0, 0, this.domElement.width, this.domElement.height
        )

        // Update time
        this.time = this.parser.t = (this.parser.t + 1) & 0xffff
      }

      requestAnimationFrame(step)
    }

    pause() {
      this.running = false
    }

    toggle() {
      if (this.running) this.pause()
      else this.run()
    }

    reset() {
      this.time = 0
      this.parser.t = 0
      this.start = performance.now()
    }

    // Handle window resize
    resize() {
      this.domElement.width = window.innerWidth
      this.domElement.height = window.innerHeight

      // Recalculate resolution for new size
      this.calculateResolution()

      // Recreate offscreen canvas if needed
      if (this.offscreenCanvas.width !== this.renderWidth) {
        this.offscreenCanvas.width = this.renderWidth
        this.offscreenCanvas.height = this.renderHeight
        this.offscreenCtx = this.offscreenCanvas.getContext('2d')
      }

      this.ctx.imageSmoothingEnabled = true
      this.ctx.imageSmoothingQuality = 'high'
    }
  }

  // Program wrapper class for compatibility
  class Program {
    constructor(source) {
      this.code = source
    }
  }

  return { Parser, Console, Program }

}))