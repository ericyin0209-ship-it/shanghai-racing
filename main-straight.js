// Main-straight complex extents shared by every module that draws the pit building, grandstand or bridges.
// Source: OSM footprints in surroundings-data.json ("garages" -75..-397; "A看台" body -70..-400 with the two bridges
// mapped as its end bars -38..-72 and -400..-432, x -73..72), cross-checked on the 2018 SkySat image (photo 01).
// These are mapped/photographic extents, not survey data.
export const PIT_Z0=-75,PIT_Z1=-397,PIT_LEN=PIT_Z0-PIT_Z1,PIT_MID=(PIT_Z0+PIT_Z1)/2;
// preview.28: FIA pit lane drawings (2019 doc 2, 2024 doc 4) show 36 units (A, B, C, 1-33) along this building, not 22.
// Units are spread evenly; per-bay details written for the old 14.4 m bay scale by PIT_K.
export const PIT_BAYS=36,PIT_BAY=PIT_LEN/PIT_BAYS,PIT_BAY0=PIT_Z0-PIT_BAY/2,PIT_K=PIT_BAY/14.4;
export const STAND_Z0=-400;
export const BRIDGE_Z=[-55,-416];
// The stand roof runs on under the T16-end bridge (photo 02 shows the roof meeting the bridge).
export const STAND_ROOF_Z0=-405;
// Seat columns at the existing 0.99 m pitch from STAND_Z0 to the T1 end (-76.3), aisles every 30 columns.
export const SEAT_COLS=327,STAND_LEN=-76.5-STAND_Z0,STAND_MID=(STAND_Z0-76.5)/2;
// Stand roof height at x=40 (track-side crown). Photo 02 (2018 aerial) shows the flat panelled roof running level with
// the bridge tops; OSM tags the stand 35 m. Estimate, not survey; the seating rake below is unchanged.
export const STAND_ROOF_Y=35.5;
// Paddock team pavilions (OSM glass buildings behind the pit building, tagged 5.5 m / 1 level). Photos 02 (2018) and 03
// show two glazed storeys under a deep low hipped roof, so they are drawn ~7 m tall. Height is a photo estimate.
export const PAVILION_HEIGHT=7.0;
export const isTeamPavilion=(tags,cx,cz)=>tags?.['building:material']==='glass'&&cx<-75&&cz>-430&&cz<0;
// preview.27 grandstand section. Before this, five modules each repeated a single 42-row rake that topped out at ~20 m,
// leaving ~15 m of air under the 35.5 m roof (brief photo 15). Photo 05 is taken from the upper tier looking well down on
// the ~12 m pit-building roof, so the upper tier is lifted over a glazed hospitality band: rows 0-20 keep the old lower
// rake; rows 21-41 start at 16.6 m with a steeper 0.52 m rise and finish near 27 m. Heights are photo estimates.
export const STAND_ROWS=42,LOWER_ROWS=21,UPPER_Y0=16.6,UPPER_RISE=.52;
export const seatX=r=>29+r*.75+(r>=LOWER_ROWS?2.4:0);
export const seatTop=r=>r<LOWER_ROWS?1.21+r*.43:UPPER_Y0+(r-LOWER_ROWS)*UPPER_RISE;
export const SUITE_X=46.6,SUITE_Y0=10.55,SUITE_Y1=16.05;
// enclosed rear block: concourse floors and the roof slab level behind the top row
export const STAND_FLOORS=[4.8,10,15.2,20,25.2],STAND_REAR_TOP=29.25;
