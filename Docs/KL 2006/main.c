#include "stdafx.h"
/*=====================================================================
  ASpectrum Emulator. This is our contribution to the Spectrum World.
  We're trying to release our simple, useable and portable Spectrum
  emulator, always thinking in the GNU/Linux community.

 This program is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.

 Copyright (c) 2000 Santiago Romero Iglesias
 Email: sromero@escomposlinux.org
 ======================================================================*/

#ifdef _DEBUG_
#include <mss.h>
#endif

#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <GL/glut.h>

#ifdef NO_GETOPTLONG
#include "contrib/getopt.h"
#else
#include <getopt.h>
#endif // NO_GETOPTLONG

#include "main.h"
#include "sound.h"

#include "langs.h"
#include "z80.h"
#include "snaps.h"
#include "mem.h"

#include "monofnt.h"
#include "graphics.h"
#include "debugger.h"
#include "menu.h"

#include "a_i_v.c"
#include "a_d_v.c"
#include "b_i_v.c"
#include "b_d_v.c"
#include "c_i_v.c"
#include "c_d_v.c"
#include "d_i_v.c"
#include "d_d_v.c"
#include "e_i_v.c"
#include "e_d_v.c"
#include "f_i_v.c"
#include "f_d_v.c"
#include "a_i_a.c"
#include "a_d_a.c"
#include "b_i_a.c"
#include "b_d_a.c"
#include "c_i_a.c"
#include "c_d_a.c"
#include "d_i_a.c"
#include "d_d_a.c"
#include "e_i_a.c"
#include "e_d_a.c"
#include "f_i_a.c"
#include "f_d_a.c"
#include "a_i_b.c"
#include "a_d_b.c"
#include "b_i_b.c"
#include "b_d_b.c"
#include "c_i_b.c"
#include "c_d_b.c"
#include "d_i_b.c"
#include "d_d_b.c"
#include "e_i_b.c"
#include "e_d_b.c"
#include "f_i_b.c"
#include "f_d_b.c"
#include "a_i_r.c"
#include "a_d_r.c"
#include "b_i_r.c"
#include "b_d_r.c"
#include "c_i_r.c"
#include "c_d_r.c"
#include "d_i_r.c"
#include "d_d_r.c"
#include "e_i_r.c"
#include "e_d_r.c"
#include "f_i_r.c"
#include "f_d_r.c"

tipo_emuopt emuopt = {"\0","\0","\0",GS_INACTIVE, NULL,'n',{'o', 'p', 'q', 'a', ' '} };

int activarEjes = 0, activarMalla = 1;

float valorLookAtX = 14.0;
float valorLookAtY = 8.0;
float valorLookAtZ = 0.5;

typedef struct {
	int sprite;
	int cx;
	int cy;
	int cz;
	int flipV;
	int flipH;
  float c3dx;
  float c3dy;
  float c3dz;
} tipo_pared;

typedef struct {
   int num_obj;
   int sprite;
   int coord_x;
   int coord_y;
   int coord_z;
   float coord_3d_x;
   float coord_3d_y;
   float coord_3d_z;
} tipo_objeto;

typedef struct {
   int num_habitacion;
   int offset_hab;
   int tam_hab_x;
   int tam_hab_y;
   int tam_hab_z;   
   int color_hab;
   int num_backgrounds;
   int backgrounds[10];
   int id_pared;
   int num_elementos_pared;
   tipo_pared tpared[20];
   int num_objects;
   tipo_objeto tobjects[50];
} tipo_habitacion;

// hardware definitions for spectrum 48K
tipo_hwopt hwopt = { 0xFF, 24, 128, 24, 48, 224, 16, 48, 192, 48, 8,
  224, 64, 192, 56, 24, 128, 72, SPECMDL_48K };

int v_res = 240;
int v_border = 24;

// switch between display by scanlines or display at end of frame
//int displayByScanlines=1;

// generic wrapper
extern volatile char *gkey;

/* Some global variables used in the emulator */
Z80Regs spectrumZ80;
FILE *tapfile;
char fname[512];
char *argvzero;
volatile int last_fps, frame_counter;
volatile int target_cycle;

/*----------------------------------------------------------------*/
int debug = 0, main_tecla, hay_tecla, scanl = 0, quit_thread = 0;
int fila[5][5];

/* 0 = english
 * 1 = spanish
 * 2 = valencia/catala
*/
int language = 0;

// Variables globalizadas del emulador, para encapsular "el bucle principal" *************
int tecla = 0;
int option;
FILE *fp;
char done = 0;
int offs = 0;
static int f_flash2 = 0;
static int f_flash = 1;
int target_tstate;
int current_tstate;
char value;
int poke;
char b[1024];
int hab_actual = 256;

tipo_habitacion t_room;
// ***************************************************************************************

void ExitEmulator (void);
void CreateVideoTables (void);
void UpdateKeyboard (void);
void target_incrementor (void);
void count_frames (void);
void setColorHab();
void dibujarMalla();
void dibujarEjes();
void dibujarPersonaje();
void dibujarEsqueletoParedes();
void dibujarParedes();
void dibujarParedHabGrande();
void dibujarParedHabEstrechaA();
void dibujarParedHabEstrechaB();
void dibujarFondo(int nBack);
void dibujarObjeto(int, float, float, float);
void dibujar_arco(int spt);
void ladrillo_arco (float pax, float pay, float paz, float pbx, float pby, float pbz, float pcx, float pcy, float pcz, float pdx, float pdy, float pdz, float pex, float pey, float pez, float pfx, float pfy, float pfz, float pgx, float pgy, float pgz, float phx, float phy, float phz);
void crear_menu(void);
void menu(int);

// now global
char tfont[4096];

// to know if sound is ok
extern int gSoundInited;

extern tipo_mem mem;

#define STANDAR_COPYRIGHT  "ASpectrum GNU pure C Z80 / Spectrum Emulator V " VERSION "\n" \
	  "(C) 2000-2004 Santiago Romero (NoP/Compiler), Kak & Alvaro Alea.\n" \
	  "http://aspectrum.sf.net\n" \
	  "Powered by Allegro 4 - http://alleg.sf.net\n" \
	  "Distributed under the terms of GNU Public License V2\n\n" \


int
Z80Initialization (void)
{
  FILE *fp2;
  /* we get memory and load font, spectrum ROM and
     possible snapshots selected in the command line */

/*
  printf("ASpectrum GNU pure C Z80 / Spectrum Emulator V " VERSION "\n"
	  "(C) 2000-2004 Santiago Romero (NoP/Compiler), Kak & Alvaro Alea.\n"
	  "http://aspectrum.sf.net\n"
	  "Powered by Allegro 4 - http://alleg.sf.net\n"
	  "Distributed under the terms of GNU Public License V2\n\n");
*/

  printf( STANDAR_COPYRIGHT );

  fp2=findopen_file("font.fnt");
  fread (tfont, 4096, 1, fp2);
  fclose (fp2);

  if (init_spectrum(hwopt.hw_model,emuopt.romfile)!=0){ 
  printf("Error al inicializar el Hardware Spectrum\n");
  exit (1);
  }
  spectrumZ80.RAM=mem.p; // por compatibilidad
  
  init_wrapper ();

  // COMMENT: Is this needed? -> CreateVideoTables();
  Z80Reset (&spectrumZ80, 69888);
  Z80FlagTables ();
  return 1;
}


#ifdef ZXDEB
void screenRedraw_forZXDEB (void)
{
  DisplayScreen (&spectrumZ80);
  dumpVirtualToScreen ();

}

int ZXDEB_break;
void
keyboardHandler_forZXDEB (void)
{
  UpdateKeyboard ();
  if (gkey[KEY_ESC])
    ZXDEB_break = 1;

}
#endif

void emuMainLoop ()
{
   // Read a key to interpret if available
   if (keypressed ())
	    tecla = readkey ();
	    //printf("tecla=%i\n",tecla);


   if ((tecla >> 8 == gKEY_ESC) || (tecla >>8 == KEY_TILDE ) )
   {
      // call the menu and get the selected option
	    scare_mouse ();
	    option = MainMenu (&spectrumZ80, tfont);
	    unscare_mouse ();

	    // simulate a keypress depending on the choosen option
	    switch (option)
	    {
	       case DIALOG_DEBUGGER_0:
	          tecla = gKEY_F1 << 8;
	          debug = 0;
	          break;
	       case DIALOG_DEBUGGER_1:
	          tecla = gKEY_F1 << 8;
	          debug = 1;
	          break;
	       case DIALOG_SNAP_SAVE:
	          tecla = gKEY_F2 << 8;
	          break;
	       case DIALOG_SNAP_LOAD:
	          tecla = gKEY_F3 << 8;
	          break;
	       case DIALOG_SAVE_SCR:
	          tecla = gKEY_F4 << 8;
	          break;
	       case DIALOG_RESET:
	          tecla = gKEY_F5 << 8;
	          break;
	       case DIALOG_OPEN_TAPE:
	          tecla = gKEY_F6 << 8;
	          break;
	       case DIALOG_OPTIONS:
		        tecla = gKEY_F7  << 8 ; 
		        break;
		     case DIALOG_HARDWARE:
		        tecla = gKEY_F9 << 8 ;
		        break;		
	       case DIALOG_CHANGE_LANG:
	          tecla = gKEY_F8 << 8;
	          break;
	       case DIALOG_QUIT:
	          tecla = gKEY_F10 << 8;
	          break;
	       case DIALOG_REWIND_TAPE:
		        RewindTAP (&spectrumZ80, tapfile);
		        break;
		  };
	 }
	 
	 
   switch (tecla >> 8)
	 {
	    case gKEY_F2:
	       if (FileMenu (tfont, DIALOG_SNA, fname) != 0)
	          SaveSnapshot (&spectrumZ80, fname);
	       tecla = gKEY_ESC << 8;
	       //debug = 1 - debug;
	       break;

	    case gKEY_F3:
	       if (FileMenu (tfont, DIALOG_SNAyC, fname) != 0)
	          LoadSnapshot (&spectrumZ80, fname);
	       tecla = gKEY_ESC << 8;
	       //debug = 1 - debug;
	       break;

	    case gKEY_F4:
	       if (FileMenu (tfont, DIALOG_SCR, fname) != 0)
	          SaveScreenshot (&spectrumZ80, fname);
	       tecla = gKEY_ESC << 8;
	       //debug = 1 - debug;
	       break;

	    case gKEY_F5:
	       reset_spectrum();
	       Z80Reset (&spectrumZ80, 69888);
	       tecla = gKEY_ESC << 8;
	       //debug = 1 - debug;
	       break;

	    case gKEY_F6:
	       if (FileMenu (tfont, DIALOG_TAP, fname) != 0)
		     {
			      if (emuopt.tapefile[0] != 0)
				       fclose (fp);
	      	  strncpy (emuopt.tapefile, fname, 255);
	      	  if ((fp=InitTape(fp))!= NULL)
				    {
		  			   ASprintf("Using tape file %s.\n", emuopt.tapefile);
		  			   tapfile = fp;
				    }
	       }
	       tecla = gKEY_ESC << 8;
	       //debug = 1 - debug;
	       break;

	    case gKEY_F7:
	       tecla = gKEY_ESC << 8;
	       menuopciones ();
	       //debug = 1 - debug;
	       break;

	    case gKEY_F8:
	       if (language < LANGUAGES - 1)
	          language++;
	       else
	          language = 0;
	       tecla = gKEY_ESC << 8;
	       //debug = 1 - debug;
	       break;

	    case gKEY_F9:
	       tecla = gKEY_ESC << 8;
	       menuhardware();
	       //debug = 1 - debug;
	       break;
	  
	    case gKEY_F12:
	       DebuggerHelp (tfont);
	       tecla = gKEY_ESC << 8;
	       //debug = 1 - debug;
	       break;

	    case gKEY_F10:
	       if (language == 1)
	       {
	          if (galert ("Esto cerrara Aspectrum.", "", "Confirme que desea cerrar el programa.", "Si", "No", 13, 27) == 1)
		           done = 1;
	          break;
	       }
	       else
	       {
	          if (galert ("This will close Aspectrum", "", "Are you sure?", "Yes", "No", 13, 27) == 1)
		           done = 1;
	          break;
	       }
	 };
	 

   if ((tecla >> 8) == gKEY_F1)
	 {
	    if (debug == 0) {
	       ClearScreen (0);
	       gclear ();
	       Z80Dump (&spectrumZ80, tfont);
	       DrawInstruction (&spectrumZ80, tfont);
	       ShowMem (&spectrumZ80, offs, tfont);
	       DrawHelp (tfont);
	       tecla = '.';
	       debug = 1;
	    } else {
	       debug = target_cycle = 0;
	       ClearScreen (0);
	       DisplayScreen (&spectrumZ80);
	    }
   }

   // *************************************************************************
   // the meaning of the keyb depends on being or not in debug mode:
   switch (debug)
	 {
	    case 0: 	  // emulation mode
	       (f_flash2)++;
	       if (f_flash2 >= 32)
	          f_flash2 = 0;
	       f_flash = (f_flash2 < 16 ? 0 : 1);

	       // if there is enough time, draw frame:
	       if (target_cycle < 2 || frame_counter == 0)
	       {
	          // no visible upper border
	          target_tstate = (hwopt.ts_line * (hwopt.line_upbo + hwopt.line_poin - v_border)) - hwopt.ts_lebo;
	          current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
	          hwopt.port_ff &= 0xF0;
            if (hwopt.int_type==NORMAL) spectrumZ80.petint=1;
	          Z80Run (&spectrumZ80, target_tstate - current_tstate);
	          // visible upper border      
	          for (scanl = 0; scanl < v_border; scanl++) {
		           target_tstate += hwopt.ts_line;
		           current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
		           Z80Run (&spectrumZ80, target_tstate - current_tstate);
		           displayborderscanline (scanl);
		        }

	          // Now run the emulator for all the real screen (192 lines)
            if (hwopt.int_type==INVES) spectrumZ80.petint=1;
	             for (scanl = 0; scanl < 192; scanl++)
	             {
		              // left border
		              target_tstate += hwopt.ts_lebo;
		              current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
		              hwopt.port_ff &= 0xF0;
		              Z80Run (&spectrumZ80, target_tstate - current_tstate);

		              // screen
		              target_tstate += hwopt.ts_grap;
		              current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
		              hwopt.port_ff |= 0x0F;
		              Z80Run (&spectrumZ80, target_tstate - current_tstate);

   		            // right border
		              target_tstate += (hwopt.ts_ribo + hwopt.ts_hore);
		              current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
		              hwopt.port_ff &= 0xF0;
		              Z80Run (&spectrumZ80, target_tstate - current_tstate);

   		            displayscanline2 (scanl, f_flash, &spectrumZ80);
		           }

	          // visible bottom border
	          hwopt.port_ff &= 0xF0;
	          for (scanl = 192 + v_border; scanl < v_res; scanl++) {
		           target_tstate += hwopt.ts_line;
		           current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
		           Z80Run (&spectrumZ80, target_tstate - current_tstate);
		           displayborderscanline (scanl);
		        }

	          // the last lines (56+16 lines - border)
	          // Run it for 56 lines covering bottom border and ray return
	          Z80Run (&spectrumZ80, spectrumZ80.ICount);



	                    
	          if (spectrumZ80.PC.W > 0xd700 && spectrumZ80.PC.W < 0xd7ff) display();


	          //Calc FPS
	          //sprintf (b, "FPS: %d", last_fps);
	          //gtextout (b, 4, v_res - 36, 15);

	          sprintf (b, "Room: %x Color: %d Tam: %d,%d,%d Offset: %x", t_room.num_habitacion, t_room.color_hab, t_room.tam_hab_x, t_room.tam_hab_y, t_room.tam_hab_z, t_room.offset_hab);
	          gtextout (b, 4, v_res - 36, 15);
	          
	          sprintf (b, "Backgrounds(%d): %x %x %x %x %x %x %x %x %x %x", t_room.num_backgrounds, t_room.backgrounds[0], t_room.backgrounds[1], t_room.backgrounds[2], t_room.backgrounds[3], t_room.backgrounds[4], t_room.backgrounds[5], t_room.backgrounds[6], t_room.backgrounds[7], t_room.backgrounds[8], t_room.backgrounds[9]);
	          gtextout (b, 4, v_res - 27, 15);
            sprintf (b, "Objects(%d): %x %x %x %x %x %x %x %x %x %x %x %x %x %x %x %x %x %x %x %x", t_room.num_objects, t_room.tobjects[0].num_obj, t_room.tobjects[1].num_obj, t_room.tobjects[2].num_obj, t_room.tobjects[3].num_obj, t_room.tobjects[4].num_obj, t_room.tobjects[5].num_obj, t_room.tobjects[6].num_obj, t_room.tobjects[7].num_obj, t_room.tobjects[8].num_obj, t_room.tobjects[9].num_obj, t_room.tobjects[10].num_obj, t_room.tobjects[11].num_obj, t_room.tobjects[12].num_obj, t_room.tobjects[13].num_obj, t_room.tobjects[14].num_obj, t_room.tobjects[15].num_obj, t_room.tobjects[16].num_obj, t_room.tobjects[17].num_obj, t_room.tobjects[18].num_obj, t_room.tobjects[19].num_obj);
            gtextout (b, 4, v_res - 18, 15);
	          
	          /*sprintf (b, "%3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x", readmem(0x5c00), readmem(0x5c01), readmem(0x5c02), readmem(0x5c03), readmem(0x5c04), readmem(0x5c05), readmem(0x5c06), readmem(0x5c07), readmem(0x5c08), readmem(0x5c09), readmem(0x5c0a), readmem(0x5c0b), readmem(0x5c0c), readmem(0x5c0d), readmem(0x5c0e), readmem(0x5c0b));
	          gtextout (b, 4, v_res - 45, 15);
	          sprintf (b, "%3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x", readmem(0x5c10), readmem(0x5c11), readmem(0x5c12), readmem(0x5c13), readmem(0x5c14), readmem(0x5c15), readmem(0x5c16), readmem(0x5c17), readmem(0x5c18), readmem(0x5c19), readmem(0x5c1a), readmem(0x5c1b), readmem(0x5c1c), readmem(0x5c1d), readmem(0x5c1e), readmem(0x5c1b));
	          gtextout (b, 4, v_res - 36, 15);
	          sprintf (b, "%3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x", readmem(0x5c20), readmem(0x5c21), readmem(0x5c22), readmem(0x5c23), readmem(0x5c24), readmem(0x5c25), readmem(0x5c26), readmem(0x5c27), readmem(0x5c28), readmem(0x5c29), readmem(0x5c2a), readmem(0x5c2b), readmem(0x5c2c), readmem(0x5c2d), readmem(0x5c2e), readmem(0x5c2b));
	          gtextout (b, 4, v_res - 27, 15);
	          sprintf (b, "%3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x", readmem(0x5c30), readmem(0x5c31), readmem(0x5c32), readmem(0x5c33), readmem(0x5c34), readmem(0x5c35), readmem(0x5c36), readmem(0x5c37), readmem(0x5c38), readmem(0x5c39), readmem(0x5c3a), readmem(0x5c3b), readmem(0x5c3c), readmem(0x5c3d), readmem(0x5c3e), readmem(0x5c3b));
	          gtextout (b, 4, v_res - 18, 15);
	          sprintf (b, "%3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x %3x", readmem(0x5c40), readmem(0x5c41), readmem(0x5c42), readmem(0x5c43), readmem(0x5c44), readmem(0x5c45), readmem(0x5c46), readmem(0x5c47), readmem(0x5c48), readmem(0x5c49), readmem(0x5c4a), readmem(0x5c4b), readmem(0x5c4c), readmem(0x5c4d), readmem(0x5c4e), readmem(0x5c4b));
	          gtextout (b, 4, v_res - 9, 15);*/

	          /*sprintf (b, "   %2x %2x", readmem(0x5c0f), readmem(0x5c2f));
	          gtextout (b, 4, v_res - 99, 15);
	          sprintf (b, "%2x %2x", readmem(0x5c41), readmem(0x5c45));
	          gtextout (b, 4, v_res - 90, 15);*/
            
	          scare_mouse ();
	          dumpVirtualToScreen ();
	          unscare_mouse ();

	       }
	       else
	       {
	          // If we have not enough time, don't draw the screen,
	          // only emulate

	          // no visible upper border
	          target_tstate = (hwopt.ts_line * (hwopt.line_upbo + hwopt.line_poin)) - hwopt.ts_lebo;
	          current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
	          hwopt.port_ff &= 0xF0;
	          Z80Run (&spectrumZ80, target_tstate - current_tstate);

	          // Now run the emulator for all the real screen (192 lines)
	          for (scanl = 0; scanl < 192; scanl++)
		        {
		          // left border
		          target_tstate += hwopt.ts_lebo;
		          current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
		          hwopt.port_ff &= 0xF0;
		          Z80Run (&spectrumZ80, target_tstate - current_tstate);

		          // Screen
		          target_tstate += hwopt.ts_grap;
		          current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
		          hwopt.port_ff |= 0x0F;
		          Z80Run (&spectrumZ80, target_tstate - current_tstate);

		          // right border 
		          target_tstate += (hwopt.ts_ribo + hwopt.ts_hore);
		          current_tstate = spectrumZ80.IPeriod - spectrumZ80.ICount;
		          hwopt.port_ff &= 0xF0;
		          Z80Run (&spectrumZ80, target_tstate - current_tstate);
		        }
	          // visible bottom border
	          hwopt.port_ff &= 0xF0;
	          Z80Run (&spectrumZ80, spectrumZ80.ICount);
	       }

	       // Speed control without sound
	       if (!gSoundInited)
	          while (target_cycle == 0);
	       else
	       {
	          gSoundSync ();	// wait for 1/50th
	          soundDump ();
	          target_cycle = 0;
	       }

	       target_cycle--;
	       frame_counter++;
	       UpdateKeyboard ();
	       break;


      // Debug mode:         
	    case 1:
	       switch (tecla & 0xFF)
	       {

	          // show the Spectrum current screen, wait a key and return
	          case 's':
	             ClearScreen (0);
	             DisplayScreen (&spectrumZ80);
	             dumpVirtualToScreen ();
	             readkey ();
	             ClearScreen (0);
	             gclear ();
	             DrawHelp (tfont);
	             ShowMem (&spectrumZ80, offs, tfont);
	             DrawHelp (tfont);
	             Z80Dump (&spectrumZ80, tfont);
	             DrawInstruction (&spectrumZ80, tfont);
	             break;

	          // Run the emulator until PC = given address
	          case 't':
	             GetHexValue (2, 130, lang_runto_t[language], b, tfont, 6, 0, 6);
	             spectrumZ80.TrapAddress = strtol (b, (char **) NULL, 16);
	             while (!keypressed () && spectrumZ80.PC.W != spectrumZ80.TrapAddress)
		           {
		              Z80Run (&spectrumZ80, 1);
		  						Z80Dump (&spectrumZ80, tfont);
		  						DrawInstruction (&spectrumZ80, tfont);
		  						ShowMem (&spectrumZ80, offs, tfont);
		           }
	             break;

	          // Run the emulator on simulation mode until PC = given address
	          case 'w':
	       	     GetHexValue (2, 130, lang_runto_w[language], b, tfont, 6, 0, 6);
	      			 spectrumZ80.TrapAddress = strtol (b, (char **) NULL, 16);
	             spectrumZ80.dobreak = 1;
	             debug = 0;
	             Z80Dump (&spectrumZ80, tfont);
	             DrawInstruction (&spectrumZ80, tfont);
	             ShowMem (&spectrumZ80, offs, tfont);
	             DrawHelp (tfont);
	             break;

	          // Poke memory
	          case 'p':
	             GetHexValue (2, 130, lang_poke[language], b, tfont, 6, 0, 6);
	             poke = strtol (b, (char **) NULL, 16);
	             GetHexValue (2, 130, lang_value[language], b, tfont, 6, 0, 6);
	             value = strtol (b, (char **) NULL, 16);
	             Z80MemWrite (poke, value, &spectrumZ80);
	             Z80Dump (&spectrumZ80, tfont);
	             DrawInstruction (&spectrumZ80, tfont);
	             ShowMem (&spectrumZ80, offs, tfont);
	             DrawHelp (tfont);
	             break;

	             // Run the emulation until ICount < 100 (near interrupt)
	             case 'i':
	             debug = 0;
	             while (spectrumZ80.ICount > 50 && !keypressed ())
		           {
		              Z80Run (&spectrumZ80, 1);
		           }
	             debug = 1;
	             tecla = '.';
	             Z80Dump (&spectrumZ80, tfont);
	             DrawInstruction (&spectrumZ80, tfont);
	             ShowMem (&spectrumZ80, offs, tfont);
	             DrawHelp (tfont);
	             break;

	          // change the value of the Z80 registers:
	          case 'A':
	             GetHexValue (2, 130, lang_change_af2[language], b, tfont, 6, 0, 6);
	             spectrumZ80.AFs.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'a':
	             GetHexValue (2, 130, lang_change_af[language], b, tfont, 6, 0, 6);
	             spectrumZ80.AF.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'B':
	             GetHexValue (2, 130, lang_change_bc2[language], b, tfont, 6, 0, 6);
	             spectrumZ80.BCs.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'b':
	             GetHexValue (2, 130, lang_change_bc[language], b, tfont, 6, 0, 6);
	             spectrumZ80.BC.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'D':
	             GetHexValue (2, 130, lang_change_de2[language], b, tfont, 6, 0, 6);
	             spectrumZ80.DEs.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'd':
	             GetHexValue (2, 130, lang_change_de[language], b, tfont, 6, 0, 6);
	             spectrumZ80.DE.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'H':
	             GetHexValue (2, 130, lang_change_hl2[language], b, tfont, 6, 0, 6);
	             spectrumZ80.HLs.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'h':
	             GetHexValue (2, 130, lang_change_hl[language], b, tfont, 6, 0, 6);
	             spectrumZ80.HL.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'x':
	             GetHexValue (2, 130, lang_change_ix[language], b, tfont, 6, 0, 6);
	             spectrumZ80.IX.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'y':
	             GetHexValue (2, 130, lang_change_iy[language], b, tfont, 6, 0, 6);
	             spectrumZ80.IY.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'S':
	             GetHexValue (2, 130, lang_change_sp[language], b, tfont, 6, 0, 6);
	             spectrumZ80.SP.W = strtol (b, (char **) NULL, 16);
	             break;
	          case 'n':
	             if (offs > 0)
		              offs -= 2;
	             ShowMem (&spectrumZ80, offs, tfont);
	             break;
	          case 'm':
	             if (offs < 0xFFFF - 18)
		              offs += 2;
	             ShowMem (&spectrumZ80, offs, tfont);
	             break;
	          case 'l':
	             GetHexValue (2, 130, lang_change_mem[language], b, tfont, 6, 0, 6);
	             offs = strtol (b, (char **) NULL, 16);
	             if (offs > 0xFFFF - 18)
		              offs = 0xFFFF - 18;
	             else if (offs < 0)
		               offs = 0;
	             if (offs & 1)
		              (offs)--;
	             ShowMem (&spectrumZ80, offs, tfont);
	             break;

	          // Advance emulation by 1 instruction
	          case ' ':
	          case '\r':
	          case '\n':
	             Z80Run (&spectrumZ80, 1);
	             DrawInstruction (&spectrumZ80, tfont);
	             Z80Dump (&spectrumZ80, tfont);
	             ShowMem (&spectrumZ80, offs, tfont);
	             break;
	       }
	       break;
	 }

   tecla = 0;

   // *************************************************************************


} // Fin emuMainLoop

int long_datos_backs (int id_back) {

   int b_temp = 2; // 0,1,2,3,4,5,6,7,10,11,12,13,14,15,16,17
   
   if (id_back >= 8 && id_back <= 11) // 8,9,a,b
      b_temp = 1;
      
   if (id_back == 12) // c
      b_temp = 13;
   
   if (id_back == 13 || id_back == 14) // d,e
      b_temp = 14;
   
   if (id_back == 15) // f
      b_temp = 12;

   return b_temp; // Devuelve el número de bloques de 8 bytes que utiliza el fondo en la memoria de trabajo (la situada a partir de 5c88)
}

int long_datos_objs (int id_obj) {

   int o_temp = 1;
   
   if (id_obj == 8 || id_obj == 13)
      o_temp = 2;

   return o_temp; // Devuelve el número de bloques de 8 bytes que utiliza el objeto en la memoria de trabajo (la situada a partir de 5c88)
}


int obtener_x1 (int id_obj) {

   int valor = 0;

   if (id_obj == 12 || id_obj == 26 || id_obj == 28)
      valor = 1;
   
   return valor;
   
}

int obtener_y1 (int id_obj) {

   int valor = 0;

   if (id_obj == 2 || id_obj == 8 || id_obj == 12 || id_obj == 27)
      valor = 1;
   
   return valor;
   
}

int obtener_z1 (int id_obj) {

   int valor = 0;

   if (id_obj == 11 || id_obj == 17 || id_obj == 19)
      valor = 12;
   
   return valor;
   
}

void cargar_datos_habitacion() {

  int i, tip_obj, cant_obj;
  int p_hab_ini = 0x6251;
  int p_fin_hab_act;
  int pos_mem_num_hab_tmp, num_hab_tmp, offset_tmp;
  int pos_mem_backg_tmp, pos_mem_obj_tmp;
  int pos_mem_pared;
  int despla_hasta_pared, despla_hasta_objs;
  float temp_a, temp_b, temp_c;
  
  t_room.color_hab = readmem(0x5bad);
  
  t_room.num_habitacion = readmem(0x5c10);
  
  t_room.tam_hab_x = readmem(0x5bab);
  t_room.tam_hab_y = readmem(0x5bac);
  t_room.tam_hab_z = readmem(0x5bae);

  // Obtener offset
  pos_mem_num_hab_tmp = p_hab_ini;
  num_hab_tmp = readmem(pos_mem_num_hab_tmp);
  
  while (num_hab_tmp != t_room.num_habitacion) {
    offset_tmp = readmem(pos_mem_num_hab_tmp + 0x0001);
    pos_mem_num_hab_tmp += (offset_tmp + 1);
    num_hab_tmp = readmem(pos_mem_num_hab_tmp);
  }

  t_room.offset_hab = readmem(pos_mem_num_hab_tmp + 0x0001);

  // Obtener backgrounds
  t_room.num_backgrounds = 0;
  
  for (i = 0; i <= 9; i++)
     t_room.backgrounds[i] = 0x00ff;

  p_fin_hab_act = pos_mem_num_hab_tmp + t_room.offset_hab;
  pos_mem_backg_tmp = pos_mem_num_hab_tmp + 3;
  
  do {
  	t_room.backgrounds[t_room.num_backgrounds] = readmem(pos_mem_backg_tmp);
  	t_room.num_backgrounds++;
  	pos_mem_backg_tmp++;
  } while ((readmem(pos_mem_backg_tmp) != 0x00FF) && (pos_mem_backg_tmp <= p_fin_hab_act));

  // Obtener datos de la pared
  t_room.id_pared = t_room.backgrounds[(t_room.num_backgrounds - 1)]; // Se que el id de la pared será el último background cargado
  
  t_room.num_elementos_pared = long_datos_backs(t_room.id_pared);
  
  for (i = 0; i <= 19; i++)
     t_room.tpared[i].sprite = 0x0fff; // Los marcamos como "vacios"
     
  despla_hasta_pared = 0;
  
  for (i= 0; i <= (t_room.num_backgrounds - 2); i++) // Recorro los objetos que no son pared para determinar en que posicion de la mem de trabajo empieza la pared
     despla_hasta_pared += (long_datos_backs(t_room.backgrounds[i]) * 0x0020);
     
  pos_mem_pared = 0x5c88 + despla_hasta_pared; // Tenemos el inicio de los datos de la pared
  // pos_mem_fin_pared = pos_mem_pared + (t_room.num_elementos_pared * 0x0020) - 0x0020;

  for (i = 0; i <= (t_room.num_elementos_pared - 1); i++) {
     // aquí carga datos de la pared
     t_room.tpared[i].sprite = readmem(pos_mem_pared);
     t_room.tpared[i].cx = readmem(pos_mem_pared + 1);
     t_room.tpared[i].cy = readmem(pos_mem_pared + 2);
     t_room.tpared[i].cz = readmem(pos_mem_pared + 3);
     t_room.tpared[i].flipV = (readmem(pos_mem_pared + 7) & 0x0080) >> 6;
     t_room.tpared[i].flipH = (readmem(pos_mem_pared + 7) & 0x0040) >> 5;
     // Pasar coordenadas de 2d a 3d de los datos de la pared (con x1, y1 y z1 = 0)
     temp_a = t_room.tpared[i].cx - 72; temp_b = temp_a / 16;
     t_room.tpared[i].c3dx = temp_b;
     temp_a = t_room.tpared[i].cy - 72; temp_b = temp_a / 16;
     t_room.tpared[i].c3dy = temp_b;
     temp_a = t_room.tpared[i].cz - 128; temp_b = temp_a / 12;
     t_room.tpared[i].c3dz = temp_b;
     pos_mem_pared += 0x0020; // Colocamos el "puntero" en el siguiente dato de pared
  }
  
  // Obtener objects
  t_room.num_objects = 0;

  for (i = 0; i <= 49; i++) {
     t_room.tobjects[i].num_obj = 0x00ff;
     t_room.tobjects[i].coord_x = 0x00ff;
     t_room.tobjects[i].coord_y = 0x00ff;
     t_room.tobjects[i].coord_z = 0x00ff;
     t_room.tobjects[i].coord_3d_x = 99;
     t_room.tobjects[i].coord_3d_y = 99;
     t_room.tobjects[i].coord_3d_z = 99;
  }

  pos_mem_obj_tmp = pos_mem_backg_tmp + 0x0001;
  
  while (pos_mem_obj_tmp < p_fin_hab_act) { // Comprueba que hay objectos
  	tip_obj = (readmem(pos_mem_obj_tmp) & 0x00f8) >> 3; // Objecto
  	cant_obj = (readmem(pos_mem_obj_tmp) & 0x0007) + 1; // Cantidad del objeto 	
  	
  	for (i = 1; i <= cant_obj; i++) {
  		pos_mem_obj_tmp++;
  		t_room.tobjects[t_room.num_objects].num_obj = tip_obj;
  		t_room.tobjects[t_room.num_objects].sprite = 0x00ff; // Lo cogerá en otra parte
  		t_room.tobjects[t_room.num_objects].coord_x = 0x00ff; // Lo cogerá en otra parte
  		t_room.tobjects[t_room.num_objects].coord_y = 0x00ff; // Lo cogerá en otra parte
  		t_room.tobjects[t_room.num_objects].coord_z = 0x00ff; // Lo cogerá en otra parte
  		t_room.num_objects++;
  	}
  	
  	pos_mem_obj_tmp++;
  }
  
  if (t_room.num_objects > 0) {

    //Obtener coordenadas objetos de la memoria de trabajo  
  	pos_mem_obj_tmp = 0x5c89;
  
  	despla_hasta_objs = 0; // Contendrá el número a sumar a pos_mem_obj_tmp para posicionarnos sobre el primer objeto en la memoria de trabajo
  
  	for (i = 0; i < t_room.num_backgrounds; i++) {
  		despla_hasta_objs += (long_datos_backs(t_room.backgrounds[i]) * 0x0020);
  	}

  	pos_mem_obj_tmp += despla_hasta_objs;

  	for (i = 0; i < t_room.num_objects; i++) {
  		t_room.tobjects[i].sprite = readmem(pos_mem_obj_tmp-1);
     	t_room.tobjects[i].coord_x = readmem(pos_mem_obj_tmp); // Seran coordenadas del mundo 2d, tienen que pasarse a 3d
     	t_room.tobjects[i].coord_y = readmem(pos_mem_obj_tmp+1);
     	t_room.tobjects[i].coord_z = readmem(pos_mem_obj_tmp+2);
     	pos_mem_obj_tmp += long_datos_objs(t_room.tobjects[i].num_obj) * 0x0020;
  	}

  	// Pasar coordenadas de 2d a 3d de los objetos
  	for (i = 0; i < t_room.num_objects; i++) { 		
    	temp_a = 8 * obtener_x1(t_room.tobjects[i].num_obj);
    	temp_b = t_room.tobjects[i].coord_x - temp_a - 72;
    	temp_c = temp_b / 16;
    	t_room.tobjects[i].coord_3d_x = temp_c;
     	temp_a = 8 * obtener_y1(t_room.tobjects[i].num_obj);
     	temp_b = t_room.tobjects[i].coord_y - temp_a - 72;
     	temp_c = temp_b / 16;
     	t_room.tobjects[i].coord_3d_y = temp_c;
  		temp_a = 4 * obtener_z1(t_room.tobjects[i].num_obj);
  		temp_b = t_room.tobjects[i].coord_z - temp_a - 128;
  		temp_c = temp_b / 12;
  		t_room.tobjects[i].coord_3d_z = temp_c;
  	}

  }
  
}

void assignarValorLA(float pX, float pY, float pZ) {
   valorLookAtX = pX;
   valorLookAtY = pY;
   valorLookAtZ = pZ;
}

void init() {
	glDepthFunc(GL_LEQUAL);
	glEnable(GL_DEPTH_TEST);
  glClearColor(0.0, 0.0, 0.0, 1.0);
  glClearDepth(1.0);
  
  glMatrixMode(GL_PROJECTION); 
  glLoadIdentity();  
  gluPerspective(60.0, 1.0, 1.0, 100.0);
}

void display() {
	int k;
	
	cargar_datos_habitacion();
	
  glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);    
  
  glMatrixMode(GL_MODELVIEW);
  
  glLoadIdentity();
  
  gluLookAt(valorLookAtX, valorLookAtY, valorLookAtZ, 4.0, 0.0, -4.0, 0.0, 1.0, 0.0);
    
  //if (activarMalla == 1) dibujarMalla();

  if (activarEjes == 1) dibujarEjes();
  
  //dibujarEsqueletoParedes();
  
  //if (t_room.num_habitacion != hab_actual) {
  //  hab_actual = t_room.num_habitacion;
    dibujarParedes();
  //}
  
  dibujarPersonaje();
  
  for (k = 0; k < t_room.num_backgrounds; k++)
     dibujarFondo(t_room.backgrounds[k]);

  for (k = 0; k < t_room.num_objects; k++)
     dibujarObjeto(t_room.tobjects[k].sprite, t_room.tobjects[k].coord_3d_x, t_room.tobjects[k].coord_3d_y, t_room.tobjects[k].coord_3d_z);
  
  glutSwapBuffers();
    
  glFlush();
}
void dibujarEjes() {
     glBegin(GL_LINES);  // Ejes
        glColor3f(0.0, 0.0, 1.0);
        glVertex3f(0.0, 0.0, 0.0);
        glVertex3f(2.5, 0.0, 0.0);
        glColor3f(0.0, 1.0, 0.0);
        glVertex3f(0.0, 0.0, 0.0);
        glVertex3f(0.0, 2.5, 0.0);
        glColor3f(1.0, 0.0, 0.0);
        glVertex3f(0.0, 0.0, 0.0);
        glVertex3f(0.0, 0.0, 2.5);
     glEnd();
  
     glPushMatrix();  // Cono eje x
     glColor3f(0.0, 0.0, 0.5);
     glRotatef(90.0, 0, 1, 0);
     glTranslatef(0, 0, 2.5);
     glutSolidCone(0.125, 0.5, 20, 20);
     glPopMatrix();

     glPushMatrix();  // Cono eje y
     glColor3f(0.0, 0.5, 0.0);
     glRotatef(-90.0, 1, 0, 0);
     glTranslatef(0, 0, 2.5);
     glutSolidCone(0.125, 0.5, 20, 20);
     glPopMatrix();

     glPushMatrix();  // Cono eje z
     glColor3f(0.5, 0.0, 0.0);
     glTranslatef(0, 0, 2.5);
     glutSolidCone(0.125, 0.5, 20, 20);
     glPopMatrix();
}

void setColorHab() {

  switch (t_room.color_hab) {
     case 67:
        glColor3f(1.0, 0.0, 1.0); // Rosa
        break;
     case 68:
        glColor3f(0.0, 1.0, 0.0); // Verde
        break;
     case 69:
        glColor3f(0.0, 1.0, 1.0); // Azul
        break;
     case 70:
        glColor3f(1.0, 1.0, 0.0); // Amarillo
        break;
     default:
        glColor3f(1.0, 1.0, 1.0); // Blanco
        break;
  }

}

void dibujarMalla() {
	int i;
	
   setColorHab();	

   if (t_room.tam_hab_x == 32) {
     for (i = 0; i <= 8; i++) {  // Malla
           glBegin(GL_LINES);
              glVertex3f(2.0, 0.0, 0.0 - i); // Horizontal
              glVertex3f(6.0, 0.0, 0.0 - i);
           glEnd();
     }
     for (i = 0; i <= 4; i++) {  // Malla
           glBegin(GL_LINES);
              glVertex3f(2.0 + i, 0.0, 0.0); // Vertical
              glVertex3f(2.0 + i, 0.0, -8.0);              
           glEnd();
     }
   }

   if (t_room.tam_hab_y == 32) {
     for (i = 0; i <= 8; i++) {  // Malla
           glBegin(GL_LINES);
              glVertex3f(0.0 + i, 0.0, -2.0); // Vertical
              glVertex3f(0.0 + i, 0.0, -6.0);              
           glEnd();
     }
     for (i = 2; i <= 6; i++) {  // Malla
           glBegin(GL_LINES);
              glVertex3f(0.0, 0.0, 0.0 - i); // Horizontal
              glVertex3f(8.0, 0.0, 0.0 - i);
           glEnd();
     }
   }

   if ((t_room.tam_hab_x == 64) && (t_room.tam_hab_y == 64)) {
     for (i = 0; i <= 8; i++) {  // Malla
           glBegin(GL_LINES);
              glVertex3f(0.0 + i, 0.0, 0.0); // Vertical
              glVertex3f(0.0 + i, 0.0, -8.0);              
              glVertex3f(0.0, 0.0, 0.0 - i); // Horizontal
              glVertex3f(8.0, 0.0, 0.0 - i);
           glEnd();
     }
   }

}

void dibujarPersonaje() {
	
	int perX, perY, perZ;
	float tempA, tempB;
	float cordX, cordY, cordZ;
	int spriteCuerpo; // 18,19:Hombre  1d,1e:Lobo
	int cuerpo; // 1:Hombre 2:Lobo
	int direccion; // 1:Norte 2:Sur 3:Este 4:Oeste
	
	perX = readmem(0x5c09);
	perY = readmem(0x5c0a);
	perZ = readmem(0x5c0b);
	
	tempA = perX + 8 - 72;
	tempB = tempA / 16;
	cordX = tempB;

	tempA = perY + 8 - 72;
	tempB = tempA / 16;
	cordY = tempB;

	tempA = perZ - 128;
	tempB = tempA / 12;
	cordZ = tempB * 0.75;
	
	spriteCuerpo = readmem(0x5c41);
	
	if ((spriteCuerpo == 0x18) || (spriteCuerpo == 0x19))
	   cuerpo = 1;
	else
	   cuerpo = 2;
	   
	if (readmem(0x5c0f) >= 0x4c) {
    direccion = 2; // Sur
		if ((spriteCuerpo == 0x18) || (spriteCuerpo == 0x1d)) direccion = 1; // Norte
	} else {
    direccion = 3; // Este
		if ((spriteCuerpo == 0x18) || (spriteCuerpo == 0x1d)) direccion = 4; // Oeste
	}

  if (cuerpo == 1)
     glColor3f(0.75, 1.0, 1.0);
  else
     glColor3f(1.0, 0.5, 0.5);
     
  /*glBegin(GL_LINES);
     glVertex3f(cordX, cordZ, -0.0);
     glVertex3f(cordX, cordZ, -8.0);
  glEnd();
  glBegin(GL_LINES);
     glVertex3f(0.0, cordZ, -cordY);
     glVertex3f(8.0, cordZ, -cordY);
  glEnd();*/

  glPushMatrix();
  glTranslatef(cordX,cordZ,-cordY);
  glutSolidSphere(0.2, 30, 30);
  glTranslatef(0.0,0.5,0.0);
  glutSolidSphere(0.2, 30, 30);
    
  switch (direccion) {
     case 1: // Norte
     	  glRotatef(180.0, 0, 1, 0);
        break;
     case 3: // Este
     	  glRotatef(90.0, 0, 1, 0);
        break;
     case 4: // Oeste
     	  glRotatef(-90.0, 0, 1, 0);
        break;
  }
  
  glTranslatef(0.0,0.75,0.0);
  glutSolidCone(0.25, 0.75, 20, 20);
  glPopMatrix();   
	
}

void dibujarEsqueletoParedes() {
	
	float limNorteA = -8.0, limSurA = 0.0, limEsteA = 8.0, limOesteA = 0.0;
	float limNorteB = -8.0, limSurB = 0.0, limEsteB = 8.0, limOesteB = 0.0;
	
	if (t_room.tam_hab_y == 32) {
     limNorteA = -6.0;
     limSurA = -2.0;
     limNorteB = -6.0;
	}

	if (t_room.tam_hab_x == 32) {
		 limOesteB = 2.0;
		 limEsteB = 6.0;
     limOesteA = 2.0;
	}

  glPushMatrix();
  
  setColorHab();

  glBegin(GL_LINE_LOOP); // Cara oeste
     glVertex3f(limOesteA, 0.0, limSurA);
     glVertex3f(limOesteA, 0.0, limNorteA);
     glVertex3f(limOesteA, 5.0, limNorteA);
     glVertex3f(limOesteA, 5.0, limSurA);
  glEnd();

  glBegin(GL_LINE_LOOP); // Cara norte
     glVertex3f(limOesteB, 0.0, limNorteB);
     glVertex3f(limEsteB, 0.0, limNorteB);
     glVertex3f(limEsteB, 5.0, limNorteB);
     glVertex3f(limOesteB, 5.0, limNorteB);
  glEnd();

  glPopMatrix();   
}

void dibujarParedes() {

 if (t_room.tam_hab_y == 64 && t_room.tam_hab_x == 64) dibujarParedHabGrande();

 if (t_room.tam_hab_y == 32) dibujarParedHabEstrechaA();

 if (t_room.tam_hab_x == 32) dibujarParedHabEstrechaB();

}

void dibujarParedHabGrande() {

	int texture_f1, texture_b1, texture_a1, texture_c1, texture_d1; // Pared oeste
  int texture_f2, texture_b2, texture_a2, texture_c2, texture_e1; // Pared norte
			
     glGenTextures(1,&texture_f1);
     glBindTexture(GL_TEXTURE_2D,texture_f1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_v.bytes_per_pixel, f_i_v.width, f_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_a.bytes_per_pixel, f_i_a.width, f_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_r.bytes_per_pixel, f_i_r.width, f_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_b.bytes_per_pixel, f_i_b.width, f_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_b1);
     glBindTexture(GL_TEXTURE_2D,texture_b1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_i_v.bytes_per_pixel, b_i_v.width, b_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, b_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_i_a.bytes_per_pixel, b_i_a.width, b_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, b_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_i_r.bytes_per_pixel, b_i_r.width, b_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, b_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_i_b.bytes_per_pixel, b_i_b.width, b_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, b_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_a1);
     glBindTexture(GL_TEXTURE_2D,texture_a1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_v.bytes_per_pixel, a_i_v.width, a_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_a.bytes_per_pixel, a_i_a.width, a_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_r.bytes_per_pixel, a_i_r.width, a_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_b.bytes_per_pixel, a_i_b.width, a_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_c1);
     glBindTexture(GL_TEXTURE_2D,texture_c1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_i_v.bytes_per_pixel, c_i_v.width, c_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, c_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_i_a.bytes_per_pixel, c_i_a.width, c_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, c_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_i_r.bytes_per_pixel, c_i_r.width, c_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, c_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_i_b.bytes_per_pixel, c_i_b.width, c_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, c_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_d1);
     glBindTexture(GL_TEXTURE_2D,texture_d1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_v.bytes_per_pixel, d_i_v.width, d_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_a.bytes_per_pixel, d_i_a.width, d_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_r.bytes_per_pixel, d_i_r.width, d_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_b.bytes_per_pixel, d_i_b.width, d_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_f2);
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_v.bytes_per_pixel, f_d_v.width, f_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_a.bytes_per_pixel, f_d_a.width, f_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_r.bytes_per_pixel, f_d_r.width, f_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_b.bytes_per_pixel, f_d_b.width, f_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_b2);
     glBindTexture(GL_TEXTURE_2D,texture_b2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_d_v.bytes_per_pixel, b_d_v.width, b_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, b_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_d_a.bytes_per_pixel, b_d_a.width, b_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, b_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_d_r.bytes_per_pixel, b_d_r.width, b_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, b_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_d_b.bytes_per_pixel, b_d_b.width, b_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, b_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_a2);
     glBindTexture(GL_TEXTURE_2D,texture_a2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_v.bytes_per_pixel, a_d_v.width, a_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_a.bytes_per_pixel, a_d_a.width, a_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_r.bytes_per_pixel, a_d_r.width, a_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_b.bytes_per_pixel, a_d_b.width, a_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_c2);
     glBindTexture(GL_TEXTURE_2D,texture_c2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_d_v.bytes_per_pixel, c_d_v.width, c_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, c_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_d_a.bytes_per_pixel, c_d_a.width, c_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, c_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_d_r.bytes_per_pixel, c_d_r.width, c_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, c_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_d_b.bytes_per_pixel, c_d_b.width, c_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, c_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_e1);
     glBindTexture(GL_TEXTURE_2D,texture_e1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_v.bytes_per_pixel, e_i_v.width, e_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_a.bytes_per_pixel, e_i_a.width, e_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_r.bytes_per_pixel, e_i_r.width, e_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_b.bytes_per_pixel, e_i_b.width, e_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_b.pixel_data );
     break;
     default:
     break;
     }
	   

     glTexEnvf( GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE );
     
     glEnable(GL_TEXTURE_2D);
     
     // Pared oeste
     
     // F
     glBindTexture(GL_TEXTURE_2D,texture_f1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,0.25,0.0);
       glTexCoord2d(0.0,1.0); glVertex3f(0.0,0.0,-1.0);
       glTexCoord2d(1.0,1.0); glVertex3f(0.0,2.0,-1.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,2.25,0.0);
     glEnd();
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,2.25,0.0);
       glTexCoord2d(0.0,1.0); glVertex3f(0.0,2.0,-1.0);
       glTexCoord2d(1.0,1.0); glVertex3f(0.0,4.0,-1.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,4.25,0.0);
     glEnd();

     // B
     glBindTexture(GL_TEXTURE_2D,texture_b1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(-0.5,1.75,-1.25);
       glTexCoord2d(0.0,1.0); glVertex3f(-0.5,1.25,-2.5);
       glTexCoord2d(1.0,1.0); glVertex3f(-0.5,2.25,-2.5);
       glTexCoord2d(1.0,0.0); glVertex3f(-0.5,2.75,-1.25);
     glEnd();

     // A
     glBindTexture(GL_TEXTURE_2D,texture_a1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(-0.5,3.0,-2.5);
       glTexCoord2d(0.0,1.0); glVertex3f(-0.5,2.25,-4.75);
       glTexCoord2d(1.0,1.0); glVertex3f(-0.5,3.5,-4.75);
       glTexCoord2d(1.0,0.0); glVertex3f(-0.5,4.25,-2.5);
     glEnd();

     // C
     glBindTexture(GL_TEXTURE_2D,texture_c1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(-0.5,1.5,-5.5);
       glTexCoord2d(0.0,1.0); glVertex3f(-0.5,0.75,-7.0);
       glTexCoord2d(1.0,1.0); glVertex3f(-0.5,1.75,-7.0);
       glTexCoord2d(1.0,0.0); glVertex3f(-0.5,2.5,-5.5);
     glEnd();

     // D
     glBindTexture(GL_TEXTURE_2D,texture_d1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,0.25,-7.0);
       glTexCoord2d(0.0,1.0); glVertex3f(0.0,0.0,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(0.0,2.0,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,2.25,-7.0);
     glEnd();
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,2.1,-7.0);
       glTexCoord2d(0.0,1.0); glVertex3f(0.0,1.85,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(0.0,3.85,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,4.1,-7.0);
     glEnd();

     // Pared norte

     // F
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(7.0,-0.35,-8.0);
       glTexCoord2d(0.0,1.0); glVertex3f(8.0,0.0,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(8.0,2.0,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(7.0,1.65,-8.0);
     glEnd();
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(7.0,1.65,-8.0);
       glTexCoord2d(0.0,1.0); glVertex3f(8.0,2.0,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(8.0,4.0,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(7.0,3.65,-8.0);
     glEnd();

     // B
     glBindTexture(GL_TEXTURE_2D,texture_b2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(5.30,0.75,-8.5);
       glTexCoord2d(0.0,1.0); glVertex3f(6.80,1.25,-8.5);
       glTexCoord2d(1.0,1.0); glVertex3f(6.80,2.25,-8.5);
       glTexCoord2d(1.0,0.0); glVertex3f(5.30,1.75,-8.5);
     glEnd();

     
     // A
     glBindTexture(GL_TEXTURE_2D,texture_a2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(3.0,1.85,-8.5);
       glTexCoord2d(0.0,1.0); glVertex3f(5.5,2.8,-8.5);
       glTexCoord2d(1.0,1.0); glVertex3f(5.5,4.05,-8.5);
       glTexCoord2d(1.0,0.0); glVertex3f(3.0,3.1,-8.5);
     glEnd();

     // C
     glBindTexture(GL_TEXTURE_2D,texture_c2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(1.2,1.1,-8.5);
       glTexCoord2d(0.0,1.0); glVertex3f(2.2,2.0,-8.5);
       glTexCoord2d(1.0,1.0); glVertex3f(2.2,3.5,-8.5);
       glTexCoord2d(1.0,0.0); glVertex3f(1.2,2.6,-8.5);
     glEnd();

     // A
     glBindTexture(GL_TEXTURE_2D,texture_a2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.8,0.00,-8.5);
       glTexCoord2d(0.0,1.0); glVertex3f(3.0,0.95,-8.5);
       glTexCoord2d(1.0,1.0); glVertex3f(3.0,2.2,-8.5);
       glTexCoord2d(1.0,0.0); glVertex3f(0.8,1.25,-8.5);
     glEnd();

     // E
     glBindTexture(GL_TEXTURE_2D,texture_e1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,0.0,-8.0);
       glTexCoord2d(0.0,1.0); glVertex3f(1.0,0.25,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(1.0,2.25,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,2.0,-8.0);
     glEnd();
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,1.90,-8.0);
       glTexCoord2d(0.0,1.0); glVertex3f(1.0,2.15,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(1.0,4.15,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,3.90,-8.0);
     glEnd();
     
     glDisable(GL_TEXTURE_2D);

}

void dibujarParedHabEstrechaA() {
	
		 int texture_f1, texture_a1, texture_d1; // Pared oeste
		 int texture_e1, texture_a2, texture_b2, texture_c2, texture_f2; // Pared norte
			
     glGenTextures(1,&texture_f1);
     glBindTexture(GL_TEXTURE_2D,texture_f1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_v.bytes_per_pixel, f_i_v.width, f_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_a.bytes_per_pixel, f_i_a.width, f_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_r.bytes_per_pixel, f_i_r.width, f_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_b.bytes_per_pixel, f_i_b.width, f_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_a1);
     glBindTexture(GL_TEXTURE_2D,texture_a1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_v.bytes_per_pixel, a_i_v.width, a_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_a.bytes_per_pixel, a_i_a.width, a_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_r.bytes_per_pixel, a_i_r.width, a_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_b.bytes_per_pixel, a_i_b.width, a_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_d1);
     glBindTexture(GL_TEXTURE_2D,texture_d1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_v.bytes_per_pixel, d_i_v.width, d_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_a.bytes_per_pixel, d_i_a.width, d_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_r.bytes_per_pixel, d_i_r.width, d_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_b.bytes_per_pixel, d_i_b.width, d_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_b.pixel_data );
     break;
     default:
     break;
     }


     glGenTextures(1,&texture_e1);
     glBindTexture(GL_TEXTURE_2D,texture_e1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_v.bytes_per_pixel, e_i_v.width, e_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_a.bytes_per_pixel, e_i_a.width, e_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_r.bytes_per_pixel, e_i_r.width, e_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_b.bytes_per_pixel, e_i_b.width, e_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_a2);
     glBindTexture(GL_TEXTURE_2D,texture_a2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_v.bytes_per_pixel, a_d_v.width, a_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_a.bytes_per_pixel, a_d_a.width, a_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_r.bytes_per_pixel, a_d_r.width, a_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_b.bytes_per_pixel, a_d_b.width, a_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_b2);
     glBindTexture(GL_TEXTURE_2D,texture_b2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_d_v.bytes_per_pixel, b_d_v.width, b_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, b_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_d_a.bytes_per_pixel, b_d_a.width, b_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, b_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_d_r.bytes_per_pixel, b_d_r.width, b_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, b_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_d_b.bytes_per_pixel, b_d_b.width, b_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, b_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_c2);
     glBindTexture(GL_TEXTURE_2D,texture_c2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_d_v.bytes_per_pixel, c_d_v.width, c_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, c_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_d_a.bytes_per_pixel, c_d_a.width, c_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, c_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_d_r.bytes_per_pixel, c_d_r.width, c_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, c_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_d_b.bytes_per_pixel, c_d_b.width, c_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, c_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_f2);
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_v.bytes_per_pixel, f_d_v.width, f_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_a.bytes_per_pixel, f_d_a.width, f_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_r.bytes_per_pixel, f_d_r.width, f_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_a.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_b.bytes_per_pixel, f_d_b.width, f_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_b.pixel_data );
     break;
     default:
     break;
     }


     glTexEnvf( GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE );
     
     glEnable(GL_TEXTURE_2D);
     
     // Pared oeste
     
     // F
     glBindTexture(GL_TEXTURE_2D,texture_f1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,0.25,-2.0);
       glTexCoord2d(0.0,1.0); glVertex3f(0.0,0.0,-2.75);
       glTexCoord2d(1.0,1.0); glVertex3f(0.0,2.0,-2.75);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,2.25,-2.0);
     glEnd();
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,2.25,-2.0);
       glTexCoord2d(0.0,1.0); glVertex3f(0.0,2.0,-2.75);
       glTexCoord2d(1.0,1.0); glVertex3f(0.0,4.0,-2.75);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,4.25,-2.0);
     glEnd();

     // A
     glBindTexture(GL_TEXTURE_2D,texture_a1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(-0.5,3.0,-3.0);
       glTexCoord2d(0.0,1.0); glVertex3f(-0.5,2.25,-5.25);
       glTexCoord2d(1.0,1.0); glVertex3f(-0.5,3.5,-5.25);
       glTexCoord2d(1.0,0.0); glVertex3f(-0.5,4.25,-3.0);
     glEnd();
     
     // D
     glBindTexture(GL_TEXTURE_2D,texture_d1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,0.25,-5.25);
       glTexCoord2d(0.0,1.0); glVertex3f(0.0,0.0,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(0.0,2.0,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,2.25,-5.25);
     glEnd();
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,2.25,-5.25);
       glTexCoord2d(0.0,1.0); glVertex3f(0.0,2.0,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(0.0,4.0,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,4.25,-5.25);
     glEnd();

     // Pared Norte
     
     // E
     glBindTexture(GL_TEXTURE_2D,texture_e1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,0.0,-6.0);
       glTexCoord2d(0.0,1.0); glVertex3f(1.0,0.25,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(1.0,2.25,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,2.0,-6.0);
     glEnd();
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(0.0,1.9,-6.0);
       glTexCoord2d(0.0,1.0); glVertex3f(1.0,2.15,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(1.0,4.15,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(0.0,3.9,-6.0);
     glEnd();

     // A
     glBindTexture(GL_TEXTURE_2D,texture_a2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(1.0,2.35,-6.0);
       glTexCoord2d(0.0,1.0); glVertex3f(4.0,3.3,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(4.0,4.55,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(1.0,3.6,-6.0);
     glEnd();

     // B
     glBindTexture(GL_TEXTURE_2D,texture_b2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(1.30,0.75,-6.0);
       glTexCoord2d(0.0,1.0); glVertex3f(3.50,1.25,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(3.50,2.25,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(1.30,1.75,-6.0);
     glEnd();

     // C
     glBindTexture(GL_TEXTURE_2D,texture_c2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(5.2,1.6,-6.0);
       glTexCoord2d(0.0,1.0); glVertex3f(6.5,2.3,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(6.5,3.5,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(5.2,2.8,-6.0);
     glEnd();

     // F
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(7.0,-0.35,-6.0);
       glTexCoord2d(0.0,1.0); glVertex3f(8.0,0.0,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(8.0,2.0,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(7.0,1.65,-6.0);
     glEnd();
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(7.0,1.65,-6.0);
       glTexCoord2d(0.0,1.0); glVertex3f(8.0,2.0,-6.0);
       glTexCoord2d(1.0,1.0); glVertex3f(8.0,4.0,-6.0);
       glTexCoord2d(1.0,0.0); glVertex3f(7.0,3.65,-6.0);
     glEnd();
     

     glDisable(GL_TEXTURE_2D);

}

void dibujarParedHabEstrechaB() {
	
	   int texture_f1, texture_d1, texture_b1, texture_a1, texture_c1, texture_d2; // Pared oeste
	   int texture_e1, texture_a2, texture_f2; // Pared norte
	   
     glGenTextures(1,&texture_f1);
     glBindTexture(GL_TEXTURE_2D,texture_f1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_v.bytes_per_pixel, f_i_v.width, f_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_a.bytes_per_pixel, f_i_a.width, f_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_r.bytes_per_pixel, f_i_r.width, f_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_i_b.bytes_per_pixel, f_i_b.width, f_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, f_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_d1);
     glBindTexture(GL_TEXTURE_2D,texture_d1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_d_v.bytes_per_pixel, d_d_v.width, d_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, d_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_d_a.bytes_per_pixel, d_d_a.width, d_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, d_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_d_r.bytes_per_pixel, d_d_r.width, d_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, d_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_d_b.bytes_per_pixel, d_d_b.width, d_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, d_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_b1);
     glBindTexture(GL_TEXTURE_2D,texture_b1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_i_v.bytes_per_pixel, b_i_v.width, b_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, b_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_i_a.bytes_per_pixel, b_i_a.width, b_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, b_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_i_r.bytes_per_pixel, b_i_r.width, b_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, b_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, b_i_b.bytes_per_pixel, b_i_b.width, b_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, b_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_a1);
     glBindTexture(GL_TEXTURE_2D,texture_a1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_v.bytes_per_pixel, a_i_v.width, a_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_a.bytes_per_pixel, a_i_a.width, a_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_r.bytes_per_pixel, a_i_r.width, a_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_i_b.bytes_per_pixel, a_i_b.width, a_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, a_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_c1);
     glBindTexture(GL_TEXTURE_2D,texture_c1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_i_v.bytes_per_pixel, c_i_v.width, c_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, c_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_i_a.bytes_per_pixel, c_i_a.width, c_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, c_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_i_r.bytes_per_pixel, c_i_r.width, c_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, c_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, c_i_b.bytes_per_pixel, c_i_b.width, c_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, c_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_d2);
     glBindTexture(GL_TEXTURE_2D,texture_d2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_v.bytes_per_pixel, d_i_v.width, d_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_a.bytes_per_pixel, d_i_a.width, d_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_r.bytes_per_pixel, d_i_r.width, d_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, d_i_b.bytes_per_pixel, d_i_b.width, d_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, d_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_e1);
     glBindTexture(GL_TEXTURE_2D,texture_e1);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_v.bytes_per_pixel, e_i_v.width, e_i_v.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_a.bytes_per_pixel, e_i_a.width, e_i_a.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_r.bytes_per_pixel, e_i_r.width, e_i_r.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, e_i_b.bytes_per_pixel, e_i_b.width, e_i_b.height,GL_RGBA, GL_UNSIGNED_BYTE, e_i_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_a2);
     glBindTexture(GL_TEXTURE_2D,texture_a2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_v.bytes_per_pixel, a_d_v.width, a_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_a.bytes_per_pixel, a_d_a.width, a_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_r.bytes_per_pixel, a_d_r.width, a_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, a_d_b.bytes_per_pixel, a_d_b.width, a_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, a_d_b.pixel_data );
     break;
     default:
     break;
     }

     glGenTextures(1,&texture_f2);
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     switch (t_room.color_hab) {
     case 68: // Verde
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_v.bytes_per_pixel, f_d_v.width, f_d_v.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_v.pixel_data );
     break;
     case 70: // Amarillo
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_a.bytes_per_pixel, f_d_a.width, f_d_a.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_a.pixel_data );
     break;
     case 67: // Rosa
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_r.bytes_per_pixel, f_d_r.width, f_d_r.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_r.pixel_data );
     break;
     case 69: // Azul
     gluBuild2DMipmaps( GL_TEXTURE_2D, f_d_b.bytes_per_pixel, f_d_b.width, f_d_b.height,GL_RGBA, GL_UNSIGNED_BYTE, f_d_b.pixel_data );
     break;
     default:
     break;
     }


     glTexEnvf( GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_REPLACE );
     
     glEnable(GL_TEXTURE_2D);
     
     // Pared oeste
     
     // F
     glBindTexture(GL_TEXTURE_2D,texture_f1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.1,0.25,0.0);
       glTexCoord2d(0.0,1.0); glVertex3f(2.1,0.0,-1.0);
       glTexCoord2d(1.0,1.0); glVertex3f(2.1,2.0,-1.0);
       glTexCoord2d(1.0,0.0); glVertex3f(2.1,2.25,0.0);
     glEnd();

     // D
     glBindTexture(GL_TEXTURE_2D,texture_d1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,1.8,0.0);
       glTexCoord2d(0.0,1.0); glVertex3f(2.0,2.2,-1.0);
       glTexCoord2d(1.0,1.0); glVertex3f(2.0,4.2,-1.0);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,3.8,0.0);
     glEnd();

     // B
     glBindTexture(GL_TEXTURE_2D,texture_b1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,0.75,-1.25);
       glTexCoord2d(0.0,1.0); glVertex3f(2.0,0.25,-2.5);
       glTexCoord2d(1.0,1.0); glVertex3f(2.0,1.25,-2.5);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,1.75,-1.25);
     glEnd();

     // A
     glBindTexture(GL_TEXTURE_2D,texture_a1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,3.0,-1.5);
       glTexCoord2d(0.0,1.0); glVertex3f(2.0,2.25,-3.75);
       glTexCoord2d(1.0,1.0); glVertex3f(2.0,3.5,-3.75);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,4.25,-1.5);
     glEnd();

     // A
     glBindTexture(GL_TEXTURE_2D,texture_a1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,1.0,-3.5);
       glTexCoord2d(0.0,1.0); glVertex3f(2.0,0.25,-5.75);
       glTexCoord2d(1.0,1.0); glVertex3f(2.0,1.5,-5.75);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,2.25,-3.5);
     glEnd();

     // C
     glBindTexture(GL_TEXTURE_2D,texture_c1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,2.75,-5.5);
       glTexCoord2d(0.0,1.0); glVertex3f(2.0,2.0,-7.0);
       glTexCoord2d(1.0,1.0); glVertex3f(2.0,3.0,-7.0);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,3.75,-5.5);
     glEnd();

     // D
     glBindTexture(GL_TEXTURE_2D,texture_d2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,0.25,-7.0);
       glTexCoord2d(0.0,1.0); glVertex3f(2.0,0.0,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(2.0,2.0,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,2.25,-7.0);
     glEnd();

     // D
     glBindTexture(GL_TEXTURE_2D,texture_d2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,2.25,-7.0);
       glTexCoord2d(0.0,1.0); glVertex3f(2.0,2.0,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(2.0,4.0,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,4.25,-7.0);
     glEnd();


     // Pared Norte

     // E
     glBindTexture(GL_TEXTURE_2D,texture_e1);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,0.0,-8.0);
       glTexCoord2d(0.0,1.0); glVertex3f(3.0,0.25,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(3.0,2.25,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,2.0,-8.0);
     glEnd();
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(2.0,1.9,-8.0);
       glTexCoord2d(0.0,1.0); glVertex3f(3.0,2.15,-8.0);
       glTexCoord2d(1.0,1.0); glVertex3f(3.0,4.15,-8.0);
       glTexCoord2d(1.0,0.0); glVertex3f(2.0,3.9,-8.0);
     glEnd();

     // A
     glBindTexture(GL_TEXTURE_2D,texture_a2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(3.0,1.85,-8.5);
       glTexCoord2d(0.0,1.0); glVertex3f(5.0,2.8,-8.5);
       glTexCoord2d(1.0,1.0); glVertex3f(5.0,4.05,-8.5);
       glTexCoord2d(1.0,0.0); glVertex3f(3.0,3.1,-8.5);
     glEnd();

     // F
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(5.0,-0.35,-8.5);
       glTexCoord2d(0.0,1.0); glVertex3f(6.0,0.0,-8.5);
       glTexCoord2d(1.0,1.0); glVertex3f(6.0,2.0,-8.5);
       glTexCoord2d(1.0,0.0); glVertex3f(5.0,1.65,-8.5);
     glEnd();
     glBindTexture(GL_TEXTURE_2D,texture_f2);
     glBegin(GL_QUADS);
       glTexCoord2d(0.0,0.0); glVertex3f(5.0,1.65,-8.5);
       glTexCoord2d(0.0,1.0); glVertex3f(6.0,2.0,-8.5);
       glTexCoord2d(1.0,1.0); glVertex3f(6.0,4.0,-8.5);
       glTexCoord2d(1.0,0.0); glVertex3f(5.0,3.65,-8.5);
     glEnd();


     glDisable(GL_TEXTURE_2D);

}

void dibujarFondo(int nBack) {

	glPushMatrix();
	
	if (nBack >= 0 && nBack <= 3) // Arch north, south, east, west
		dibujar_arco(nBack);
		
	if (nBack == 21) { // High arch east
	  dibujar_arco(nBack);
	  glColor3f(0.75, 0.75, 0.75);
    glTranslatef(8.0, 2.25, -4.0);
	  ladrillo_arco(0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 0.0, 0.0, 0.75, 0.0, 1.0, 0.75, 0.0, 1.0, 0.75, -1.0, 0.0, 0.75, -1.0);
    glTranslatef(0.0, 0.0, 1.0);
	  ladrillo_arco(0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 0.0, 0.0, 0.75, 0.0, 1.0, 0.75, 0.0, 1.0, 0.75, -1.0, 0.0, 0.75, -1.0);
	}

	if (nBack == 22) { // High arch south
	  dibujar_arco(nBack);
    glColor3f(0.75, 0.75, 0.75);
    glTranslatef(3.0, 2.25, 1.0);
	  ladrillo_arco(0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 0.0, 0.0, 0.75, 0.0, 1.0, 0.75, 0.0, 1.0, 0.75, -1.0, 0.0, 0.75, -1.0);
    glTranslatef(1.0, 0.0, 0.0);
	  ladrillo_arco(0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 0.0, 0.0, 0.75, 0.0, 1.0, 0.75, 0.0, 1.0, 0.75, -1.0, 0.0, 0.75, -1.0);
	}

  glPopMatrix();
  	
}

void dibujarObjeto(int spt, float px, float py, float pz) {
	
	glPushMatrix();
	
  switch (spt) {
     case 0x17: // Pinchos
        glColor3f(0.0, 0.0, 1.0);
        glTranslatef(px + 0.5, ((pz * 0.75) + 0.125), -(py + 0.5)); // El 0.75 viene de los 12 pix de altura
        glRotatef(-90.0, 1, 0, 0);
        glutSolidCone(0.2, 0.4, 30, 30);
        break;
     case 0x3f: // Bola de pinchos
        glColor3f(1.0, 0.0, 0.0);
        glTranslatef(px + 0.5, ((pz * 0.75) + 0.125), -(py + 0.5)); // El 0.75 viene de los 12 pix de altura
        glutSolidSphere(0.25, 30, 30);
     	  break;
     case 0x07:
     case 0x36:
     case 0x37:
     case 0x3e:
     case 0x5b:
     case 0x8f:  // Diversos tipos de cubos
        glColor3f(0.75, 0.75, 0.75);
        glTranslatef(px, (pz * 0.75), -(py));
        ladrillo_arco(0.0, 0.0, 0.0, 0.0, 0.0, -1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 0.0, 0.0, 0.75, 0.0, 1.0, 0.75, 0.0, 1.0, 0.75, -1.0, 0.0, 0.75, -1.0);
        break;
     case 0xb5:
     case 0xb1:
     case 0x57: // Fuego amarillo - rojo
        glColor3f(1.0, 1.0, 0.0);
        glTranslatef(px + 0.5, ((pz * 0.75) + 0.125), -(py + 0.5)); // El 0.75 viene de los 12 pix de altura
        glutSolidSphere(0.1, 30, 30);
        glColor3f(1.0, 0.0, 0.0);
        glTranslatef(0.0,0.0,0.1);
        glutSolidSphere(0.1, 30, 30);
        break;
     case 0xb4:
     case 0xb0:
     case 0x56: // Fuego Rojo - amarillo
        glColor3f(1.0, 0.0, 0.0);
        glTranslatef(px + 0.5, ((pz * 0.75) + 0.125), -(py + 0.5)); // El 0.75 viene de los 12 pix de altura
        glutSolidSphere(0.1, 30, 30);
        glColor3f(1.0, 1.0, 0.0);
        glTranslatef(0.0,0.0,0.1);
        glutSolidSphere(0.1, 30, 30);
        break;
     case 0xb2:
     case 0xb3:
     case 0xb6:
     case 0xb7: // Pelota
        glColor3f(0.0, 1.0, 0.0);
        glTranslatef(px + 1.0, ((pz * 0.75) + 0.125), -(py + 1.0)); // El 0.75 viene de los 12 pix de altura
        glutSolidSphere(0.3, 30, 30);
        break;
     case 0x16: // Gárgola
        glColor3f(0.5, 0.75, 0.5);
        glTranslatef(px + 0.5, ((pz * 0.75) + 0.125), -(py + 0.5)); // El 0.75 viene de los 12 pix de altura
        glutSolidSphere(0.1, 30, 30);
        glTranslatef(0.0,0.1,0.0);
        glutSolidSphere(0.1, 30, 30);
        glTranslatef(0.0,0.1,0.0);
        glutSolidSphere(0.1, 30, 30);
        glTranslatef(0.1,0.1,0.0);
        glutSolidSphere(0.1, 30, 30);
        break;
     default:
        glColor3f(0.75, 0.75, 0.75);
        glTranslatef(px + 0.5, ((pz * 0.75) + 0.125), -(py + 0.5)); // El 0.75 viene de los 12 pix de altura
        glutSolidSphere(0.1, 30, 30);
        break;
  }
  
  glPopMatrix();
}

void dibujar_arco(int spt) {
	
	 int i;

   setColorHab();
   
	 glPushMatrix();
	 
   switch (spt) {
      case 0: // Arco norte
         glTranslatef(3.0, 0.0, -8.0);
         break;
      case 1: // Arco este
         glTranslatef(7.0, 0.0, -5.0);
         glRotatef(-90.0, 0, 1, 0);
         glTranslatef(0.0, 0.0, -1.0);
         break;
      case 2: // Arco sur
         glTranslatef(3.0, 0.0, 0.5);
         break;
      case 3: // Arco oeste
         glTranslatef(7.0, 0.0, -5.0);
         glRotatef(-90.0, 0, 1, 0);
         glTranslatef(0.0, 0.0, 7.5);
         break;
      case 21: // Arco alto este
         glTranslatef(7.0, 3.0, -5.0);
         glRotatef(-90.0, 0, 1, 0);
         glTranslatef(0.0, 0.0, -1.0);
         break;
      case 22: // Arco alto sur
         glTranslatef(3.0, 3.0, 0.5);
         break;
      default: break;
   }
	 
   for (i = 0; i <= 1; i++) {   
      if (i == 1) { // Genera la otra mitad del arco simétrica
        glRotatef(180.0, 0, 1, 0);
        glTranslatef(-2.0, 0.0, 0.5);
       }
   	
       ladrillo_arco(0.0,0.0,0.0, 0.0,0.0,-0.5, 0.25,0.0,-0.5, 0.25,0.0,0.0, 0.0,0.4,0.0, 0.25,0.4,0.0, 0.25,0.4,-0.5, 0.0,0.4,-0.5);
       glPushMatrix();
       glTranslatef(0.0, 0.4, 0.0);
       ladrillo_arco(0.0,0.0,0.0, 0.0,0.0,-0.5, 0.25,0.0,-0.5, 0.25,0.0,0.0, 0.0,0.4,0.0, 0.25,0.4,0.0, 0.25,0.4,-0.5, 0.0,0.4,-0.5);
       glPopMatrix();
       glPushMatrix();
       glTranslatef(0.0, 0.8, 0.0);
       ladrillo_arco(0.0,0.0,0.0, 0.0,0.0,-0.5, 0.25,0.0,-0.5, 0.25,0.0,0.0, 0.0,0.4,0.0, 0.25,0.4,0.0, 0.25,0.4,-0.5, 0.0,0.4,-0.5);
       glPopMatrix();
   
       glPushMatrix();
       glTranslatef(0.0, 1.2, 0.0);
       ladrillo_arco(0.0,0.0,0.0, 0.0,0.0,-0.5, 0.25,0.0,-0.5, 0.25,0.0,0.0, 0.075,0.4,0.0, 0.325,0.3,0.0, 0.325,0.3,-0.5, 0.075,0.4,-0.5);
       glPopMatrix();

       glPushMatrix();
       glTranslatef(0.0, 1.6, 0.0);
       ladrillo_arco(0.075,0.0,0.0, 0.075,0.0,-0.5, 0.325,-0.1,-0.5, 0.325,-0.1,0.0, 0.2,0.35,0.0, 0.425,0.2,0.0, 0.425,0.2,-0.5, 0.2,0.35,-0.5);
       glPopMatrix();
       
       glPushMatrix();
       glTranslatef(0.0, 1.8, 0.0);
       ladrillo_arco(0.2,0.15,0.0, 0.2,0.15,-0.5, 0.425,0.0,-0.5, 0.425,0.0,0.0, 0.5,0.5,0.0, 0.6,0.3,0.0, 0.6,0.3,-0.5, 0.5,0.5,-0.5);
       glPopMatrix();   

       glPushMatrix();
       glTranslatef(0.0, 1.8, 0.0);
       ladrillo_arco(0.5,0.5,0.0, 0.5,0.5,-0.5, 0.6,0.3,-0.5, 0.6,0.3,0.0, 1.0,0.7,0.0, 1.0,0.5,0.0, 1.0,0.5,-0.5, 1.0,0.7,-0.5);
       glPopMatrix();   
   }

   glPopMatrix();
}

void ladrillo_arco (float pax, float pay, float paz, float pbx, float pby, float pbz, float pcx, float pcy, float pcz, float pdx, float pdy, float pdz, float pex, float pey, float pez, float pfx, float pfy, float pfz, float pgx, float pgy, float pgz, float phx, float phy, float phz) {

  glBegin(GL_LINE_LOOP); // Cara de abajo
     glVertex3f(pax, pay, paz);
     glVertex3f(pbx, pby, pbz);
     glVertex3f(pcx, pcy, pcz);
     glVertex3f(pdx, pdy, pdz);
  glEnd();
  glBegin(GL_LINE_LOOP); // Cara izquierda
     glVertex3f(pax, pay, paz);
     glVertex3f(pex, pey, pez);
     glVertex3f(phx, phy, phz);
     glVertex3f(pbx, pby, pbz);
  glEnd();
  glBegin(GL_LINE_LOOP); // Cara derecha
     glVertex3f(pdx, pdy, pdz);
     glVertex3f(pcx, pcy, pcz);
     glVertex3f(pgx, pgy, pgz);
     glVertex3f(pfx, pfy, pfz);
  glEnd();
  glBegin(GL_LINE_LOOP); // Cara de arriba
     glVertex3f(pex, pey, pez);
     glVertex3f(pfx, pfy, pfz);
     glVertex3f(pgx, pgy, pgz);
     glVertex3f(phx, phy, phz);
  glEnd();
  glBegin(GL_LINE_LOOP); // Cara de trasera
     glVertex3f(pbx, pby, pbz);
     glVertex3f(phx, phy, phz);
     glVertex3f(pgx, pgy, pgz);
     glVertex3f(pcx, pcy, pcz);
  glEnd();
  glBegin(GL_LINE_LOOP); // Cara de delantera
     glVertex3f(pax, pay, paz);
     glVertex3f(pdx, pdy, pdz);
     glVertex3f(pfx, pfy, pfz);
     glVertex3f(pex, pey, pez);
  glEnd();

}

void crear_menu() {  
   glutCreateMenu(menu);
   glutAddMenuEntry("Vista frontal", 1);
   glutAddMenuEntry("Vista desde arriba", 2);
   glutAddMenuEntry("Vista Knight Lore", 3);
   glutAddMenuEntry("Vista desde atrás", 4);
   glutAddMenuEntry("------------------------", 99);
   glutAddMenuEntry("Ejes", 5);
   glutAddMenuEntry("Malla", 6);
   glutAddMenuEntry("------------------------", 99);
   glutAddMenuEntry("Salir", 0);
   glutAttachMenu(GLUT_RIGHT_BUTTON);
}

void menu(int opcion) {

   switch (opcion) {
      case 0:
         exit(0);
         break;
      case 1:  // Vista frontal
         assignarValorLA(4.0, 2.0, 10.0);
         break;
      case 2:  // Vista desde arriba
         assignarValorLA(4.0, 14.0, -3.75);
         break;
      case 3:  // Vista Knight Lore
         assignarValorLA(14.0, 8.0, 0.5);
         break;
      case 4:  // Vista desde atrás
         assignarValorLA(4.0, 8.0, -10.0);
         break;
      case 5:  // Activar ejes
         if (activarEjes == 0)
            activarEjes = 1;
         else
            activarEjes = 0;
         break;
      case 6:  // Desactivar ejes
         if (activarMalla == 0)
            activarMalla = 1;
         else
            activarMalla = 0;
         break;
      default: break;
   }
   
}

/*----------------------------------------------------------------
 Main function. It inits all the emulator stuff and executes it.
----------------------------------------------------------------*/
#ifndef ZXDEBUG_MFC
int main (int argc, char *argv[])
#else
int emuMain (int argc, char *argv[])
#endif
{
  int c;
  

  extern char *optarg;
  extern int optind, opterr, optopt;
  static struct option long_options[] = {
    {"rom", 1, NULL, 'r'},
    {"snap", 1, NULL, 's'},
    {"tape", 1, NULL, 't'},
    {"help", 0, NULL, 'h'},
    {"version", 0, NULL, 'V'},
    {"debug", 0, NULL, 'd'},
    {"joy", 1, NULL, 'j'},
    {"model",1, NULL,'m'},
    {0, 0, 0, 0}
  };

  // needed later to find the executable dir
  argvzero=argv[0];

// first of all do the parser for options arguments
// codigo de control de argumentos pasados al programa.
//opterr=0; // pa que narices valia esto ????

#ifndef ZXDEB

#ifdef NO_GETOPTLONG
  while ((c = getopt (argc, argv, "r:s:t:hVdj:m:")) != -1)
#else
  while ((c =
	  getopt_long (argc, argv, "r:s:t:hVdj:m:", long_options, NULL)) != -1)
#endif
    {
      switch (c)
	{
	case 'r':
	  strncpy (emuopt.romfile, optarg, 255);
	  break;
	case 's':
	  strncpy (emuopt.snapfile, optarg, 255);
	  break;
	case 't':
	  strncpy (emuopt.tapefile, optarg, 255);
	  break;
	case 'V':
	  ASprintf("ASpectrum Version " VERSION "\n");
	  done = 1;
	  break;
	case 'd':
	  debug = 1;
	  break;
	case 'j':
	  if (strstr (optarg, "G") != NULL)
	    emuopt.gunstick |= GS_GUNSTICK;
	  if (strstr (optarg, "k") != NULL)
	    ;
	  break;
	case 'm':
	  hwopt.hw_model=optarg[0] -0x30 ;
	  break;
	case ':':
	  printf("Lack of parameters\n");
	case 'h':
	case '?':
	  printf( STANDAR_COPYRIGHT 
		  "Use of Aspectrum:\n"
		  "   aspectrum [options] [snapshot or tape file]\n\n"
		  "Options can be:\n"
		  "   -r --rom romfile  use romfile instead own romfile.\n"
		  "   -s --snap file    load snapshot at startup\n"
		  "                     suported snapshot files are .SP .SNA .Z80\n"
		  "   -t --tape file    use file as tape for load routines.\n"
		  "   -d --debug        start the emulator paused in debug mode.\n"
		  "   -V --version      echo the version of the emulator.\n"
		  "   -h --help         this help.\n"
		  "   -j --joy def      enable joystick, def is a string of caracter\n"
		  "	                 for each joystick, see doc for more help.\n"
		  "   -m --model num    select the model of spectrum to emulate:\n"
		  "                     num=1 => ZX Spectrum 16K\n"
		  "                     num=2 => ZX Spectrum 48K\n"
		  "                     num=3 => Inves ZX Spectrum+ 48K\n"
		  "                     num=4 => ZX Spectrum 128K\n"
		  "                     num=5 => ZX Spectrum +2\n"
		  "                     num=6 => ZX Spectrum +3 (NO YET)\n"
		  "                     num=7 => ZX Spectrum 48K w/ Interface I (NO YET)\n"
		  "                     num=8 => ZX Spectrum 48K w/ Multiface (NO YET)\n"
		  "");
	  done = 1;
	  break;
	};
    };
  if (done != 0)
    return (0);
  // parameter error = direct exit 
#endif // ZXDEB endif

  Z80Initialization ();
  // AS_printf("Z80 Initialization completed\n");

  // check if it's the last arg
  if ((optind + 1) < argc)
    {
      printf("excess of unknow args\n");
      return (-1);
    }
  else if ((optind + 1) == argc)
    {
      if (strstr (argv[optind], ".z80") != NULL ||
	  strstr (argv[optind], ".Z80") != NULL ||
	  strstr (argv[optind], ".sp") != NULL ||
	  strstr (argv[optind], ".SP") != NULL ||
	  strstr (argv[optind], ".sna") != NULL ||
	  strstr (argv[optind], ".SNA") != NULL)
	strncpy (emuopt.snapfile, argv[optind], 255);
      else if (strstr (argv[optind], ".tap") != NULL ||
	       strstr (argv[optind], ".TAP") != NULL ||
	       strstr (argv[optind], ".tzx") != NULL ||
	       strstr (argv[optind], ".TZX") != NULL)
	strncpy (emuopt.tapefile, argv[optind], 255);
      else
	{
	  printf("Args unknow\n");
	  return (-1);
	}
    }
  // AS_printf("Posible argumento indentificado.\n");
	
  // Check and open tape file if needed
  if (emuopt.tapefile[0] == 0){
    printf("Not using tape.\n");
  }
  else if ((fp=InitTape(fp)) != NULL)
    {
      printf ("Using tape file %s.\n", emuopt.tapefile);
	  // AS_printf("Main:%x\n",fp);
	  tapfile = fp;
    }
  else
    {
      printf("Tape file %s does not exist.\n", emuopt.tapefile);
      return (-1);
    };

  // Check and open snapshot file if needed
  if (emuopt.snapfile[0] == 0) {
    printf("No loading snapshot.\n");
  }
  else if ((fp = fopen (emuopt.snapfile, "rb")) != NULL)
    {
      printf("Using snapshot file %s.\n", emuopt.snapfile);
      fclose (fp);
      if (!LoadSnapshot (&spectrumZ80, emuopt.snapfile)) {
	     printf("\n Any wrong in snapshot file. clean boot.\n");
	  }
    }
  else
    {
      printf("Snapshot file %s does not exist.\n", emuopt.snapfile);
      return (-1);
    };

  // Init all the graphic stuff:

//ASprintf("antes de initsystem\n");
  InitSystem ();
  set_window_title ("ASpectrum emulator");
//ASprintf("despues de initsystem\n");
  v_initmouse ();
  ClearScreen (7);

  // Init main variables:
  hay_tecla = main_tecla = 0;

  fila[1][1] = fila[1][2] = fila[2][2] = fila[3][2] = fila[4][2] =
    fila[4][1] = fila[3][1] = fila[2][1] = 0xFF;

  // If we start on debug mode we need to update the debugger screen:
  if (debug)
    {
      ClearScreen (0);
      Z80Dump (&spectrumZ80, tfont);
      DrawInstruction (&spectrumZ80, tfont);
      ShowMem (&spectrumZ80, offs, tfont);
      DrawHelp (tfont);
      debug = 1;
      tecla = '.';
    }

  initSoundLog ();		// first sound log initialization
//ASprintf("entrando en el bucle\n");


  // MAIN LOOP
  //while (!done)
  //  {
    	
    	emuMainLoop();

  //  }				// while (!done)

  glutInit(&argc,argv);
  glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGBA | GLUT_DEPTH);
  glutInitWindowPosition(0, 0);
  glutInitWindowSize(500, 500);
  glutCreateWindow("Knight Lore 06");
  init();
  crear_menu();
  glutDisplayFunc(display);
  glutIdleFunc(emuMainLoop);
  glutMainLoop();


  return (1);
}

END_OF_MAIN ();
// When compiling under MSDOS you should comment the above line...


/*-----------------------------------------------------------------
 CreateVideoTables ( void );
 Creates tables for direct access to videomemory pixels and attr.
------------------------------------------------------------------*/
/*
void CreateVideoTables ( void )
{
   int x = 0, y;

   for( y=0; y < 192; y++)
   {
       Pixeles[y] = 0x4000 + ((y >> 6) * 2048) +
                        (((y >> 3) & 0x07) << 5) +
                        ((y & 0x07) << 8) +
                        ((x >> 3) & 0x1f);
	   Atributos[y] = 22528 + ((x >> 3) & 0x1f) +
                        ((y >> 3) << 5);
   }
}

*/
/*-----------------------------------------------------------------
 UpdateKeyboard( void );
 Updates the keyboard variables used on the return of IN function.
------------------------------------------------------------------*/
void UpdateKeyboard (void)
{

/*=== This adds the row/column/data value for each key on spectrum kerb ===*/
#define NUM_KEYB_KEYS 256

  enum SpecKeys
  {
    SPECKEY_0, SPECKEY_1, SPECKEY_2, SPECKEY_3, SPECKEY_4, SPECKEY_5,
    SPECKEY_6, SPECKEY_7, SPECKEY_8, SPECKEY_9, SPECKEY_A, SPECKEY_B,
    SPECKEY_C, SPECKEY_D, SPECKEY_E, SPECKEY_F, SPECKEY_G, SPECKEY_H,
    SPECKEY_I, SPECKEY_J, SPECKEY_K, SPECKEY_L, SPECKEY_M, SPECKEY_N,
    SPECKEY_O, SPECKEY_P, SPECKEY_Q, SPECKEY_R, SPECKEY_S, SPECKEY_T,
    SPECKEY_U, SPECKEY_V, SPECKEY_W, SPECKEY_X, SPECKEY_Y, SPECKEY_Z,
    SPECKEY_SPACE, SPECKEY_ENTER,
    SPECKEY_SHIFT, SPECKEY_ALT, SPECKEY_CTRL
  };

  static unsigned char teclas_fila[NUM_KEYB_KEYS][3] = {
    {1, 2, 0xFE}, /* 0 */ {1, 1, 0xFE}, /* 1 */ {1, 1, 0xFD},	/* 2 */
    {1, 1, 0xFB}, /* 3 */ {1, 1, 0xF7}, /* 4 */ {1, 1, 0xEF},	/* 5 */
    {1, 2, 0xEF}, /* 6 */ {1, 2, 0xF7}, /* 7 */ {1, 2, 0xFB},	/* 8 */
    {1, 2, 0xFD},		/* 9 */
    {3, 1, 0xFE}, /* a */ {4, 2, 0xEF}, /* b */ {4, 1, 0xF7},	/* c */
    {3, 1, 0xFB}, /* d */ {2, 1, 0xFB}, /* e */ {3, 1, 0xF7},	/* f */
    {3, 1, 0xEF}, /* g */ {3, 2, 0xEF}, /* h */ {2, 2, 0xFB},	/* i */
    {3, 2, 0xF7}, /* j */ {3, 2, 0xFB}, /* k */ {3, 2, 0xFD},	/* l */
    {4, 2, 0xFB}, /* m */ {4, 2, 0xF7}, /* n */ {2, 2, 0xFD},	/* o */
    {2, 2, 0xFE}, /* p */ {2, 1, 0xFE}, /* q */ {2, 1, 0xF7},	/* r */
    {3, 1, 0xFD}, /* s */ {2, 1, 0xEF}, /* t */ {2, 2, 0xF7},	/* u */
    {4, 1, 0xEF}, /* v */ {2, 1, 0xFD}, /* w */ {4, 1, 0xFB},	/* x */
    {2, 2, 0xEF}, /* y */ {4, 1, 0xFD},	/* z */
    {4, 2, 0xFE}, /*SPACE*/
      {3, 2, 0xFE}, /*ENTER*/
      {4, 1, 0xFE}, /*RSHIFT*/ {4, 2, 0xFD}, /*ALT*/ {1, 2, 0xEF}, /*CTRL*/
  };


  /* reset the spectrum row and column keyboard signals */

  fila[1][1] = fila[1][2] = fila[2][2] = fila[3][2] =
    fila[4][2] = fila[4][1] = fila[3][1] = fila[2][1] = 0xFF;


  /* change row and column signals according to pressed key */
  /* HEY THIS DONT USE V_ALLEGRO.H DEF use ALLEGRO.H
     but by "motivos personales" I DONT CHANGE THIS X'D aka I'm tired (I supous)*/

  if (gkey[KEY_Z])
    fila[4][1] &= (0xFD);
  if (gkey[KEY_X])
    fila[4][1] &= (0xFB);
  if (gkey[KEY_C])
    fila[4][1] &= (0xF7);
  if (gkey[KEY_V])
    fila[4][1] &= (0xEF);
  if (gkey[KEY_RSHIFT] || key[KEY_LSHIFT])
    fila[4][1] &= (0xFE);

  if (gkey[KEY_A])
    fila[3][1] &= (0xFE);
  if (gkey[KEY_S])
    fila[3][1] &= (0xFD);
  if (gkey[KEY_D])
    fila[3][1] &= (0xFB);
  if (gkey[KEY_F])
    fila[3][1] &= (0xF7);
  if (gkey[KEY_G])
    fila[3][1] &= (0xEF);

  if (gkey[KEY_Q])
    fila[2][1] &= (0xFE);
  if (gkey[KEY_W])
    fila[2][1] &= (0xFD);
  if (gkey[KEY_E])
    fila[2][1] &= (0xFB);
  if (gkey[KEY_R])
    fila[2][1] &= (0xF7);
  if (gkey[KEY_T])
    fila[2][1] &= (0xEF);

  if (gkey[KEY_1])
    fila[1][1] &= (0xFE);
  if (gkey[KEY_2])
    fila[1][1] &= (0xFD);
  if (gkey[KEY_3])
    fila[1][1] &= (0xFB);
  if (gkey[KEY_4])
    fila[1][1] &= (0xF7);
  if (gkey[KEY_5])
    fila[1][1] &= (0xEF);

  if (gkey[KEY_0])
    fila[1][2] &= (0xFE);
  if (gkey[KEY_9])
    fila[1][2] &= (0xFD);
  if (gkey[KEY_8])
    fila[1][2] &= (0xFB);
  if (gkey[KEY_7])
    fila[1][2] &= (0xF7);
  if (gkey[KEY_6])
    fila[1][2] &= (0xEF);

  if (gkey[KEY_P])
    fila[2][2] &= (0xFE);
  if (gkey[KEY_O])
    fila[2][2] &= (0xFD);
  if (gkey[KEY_I])
    fila[2][2] &= (0xFB);
  if (gkey[KEY_U])
    fila[2][2] &= (0xF7);
  if (gkey[KEY_Y])
    fila[2][2] &= (0xEF);

  if (gkey[KEY_ENTER])
    fila[3][2] &= (0xFE);
  if (gkey[KEY_L])
    fila[3][2] &= (0xFD);
  if (gkey[KEY_K])
    fila[3][2] &= (0xFB);
  if (gkey[KEY_J])
    fila[3][2] &= (0xF7);
  if (gkey[KEY_H])
    fila[3][2] &= (0xEF);

  if (gkey[KEY_SPACE])
    fila[4][2] &= (0xFE);
  if (gkey[KEY_ALT] || key[KEY_ALT])
    fila[4][2] &= (0xFD);
  if (gkey[KEY_M])
    fila[4][2] &= (0xFB);
  if (gkey[KEY_N])
    fila[4][2] &= (0xF7);
  if (gkey[KEY_B])
    fila[4][2] &= (0xEF);

  if (gkey[KEY_BACKSPACE])
    {
      fila[4][1] &= (0xFE);
      fila[1][2] &= (0xFE);
    }
  if (gkey[KEY_TAB])
    {
      fila[4][1] &= (0xFE);
      fila[4][2] &= (0xFD);
    }
  if (gkey[KEY_CAPSLOCK])
	{
		fila[1][1] &= (0xFD);
		fila[4][1] &= (0xFE);
	  
  }
	
	
  /* emulate SINCLAIR JOYSTICK 1 using cursor pad and Ctrl :)
   *
   * One should replace those lines for:
   * 
   *  int cursor_up, cursor_down, cursor_left, cursor_right;
   *  if( key[KEY_UP] )  fila[X][X] &= (code_cursor_up);
   *  etc...
   * 
   * This would allow to emulate OPQA<SPACE> or INTERF1 or 2
   * or define custom keys for the cursor of the pc.
   */
#define CUP    SPECKEY_9
#define CDOWN  SPECKEY_8
#define CRIGHT SPECKEY_7
#define CLEFT  SPECKEY_6
#define FIRE   SPECKEY_0
#define filas teclas_fila

  if (gkey[KEY_UP])
    fila[filas[CUP][0]][filas[CUP][1]] &= (filas[CUP][2]);
  if (gkey[KEY_DOWN])
    fila[filas[CDOWN][0]][filas[CDOWN][1]] &= (filas[CDOWN][2]);
  if (gkey[KEY_RIGHT])
    fila[filas[CRIGHT][0]][filas[CRIGHT][1]] &= (filas[CRIGHT][2]);
  if (gkey[KEY_LEFT])
    fila[filas[CLEFT][0]][filas[CLEFT][1]] &= (filas[CLEFT][2]);
  if (gkey[KEY_RCONTROL])
    fila[filas[FIRE][0]][filas[FIRE][1]] &= (filas[FIRE][2]);

#undef filas
}


/*-----------------------------------------------------------------
 Used to count the Frames Per Second on the game.
 Do frame_counter++ after each frame draw.
------------------------------------------------------------------*/
void
count_frames (void)
{
  last_fps = frame_counter;
  frame_counter = 0;
}

END_OF_FUNCTION (count_frames);
/* When compiling under MSDOS you should comment the above line... */


/*-----------------------------------------------------------------
 Used to control the game speed. In the game loop, do like:
   do
   {
       get_keyboard_input();
       draw_one_frame_vsync_and_blit();
       frame_counter++:
       while (target_cycle > cycle)
          { do_one_game_cycle(); cycle++; }
   } while (!end_game);
------------------------------------------------------------------*/
void
target_incrementor (void)
{
  target_cycle++;
}

END_OF_FUNCTION (target_incrementor);
/* When compiling under MSDOS you should comment the above line... */

#ifndef ENABLE_LOGS
void ASprintf(char *string, ...)
{

}
#endif


// End Of Code :)
