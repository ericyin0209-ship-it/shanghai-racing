// Motion tags for the retained transmission hardware. No geometry repair is applied here.
export function suspensionWeight(x,lo,hi){return Math.max(0,Math.min(1,(Math.abs(x)-lo-.018)/Math.max(.001,hi-lo-.043)));}
export function suspensionAccessory(name,centre){
 const side=centre.x>0?'left':'right';
 if(/^Front track rod\s*\|/i.test(name))return {part:'suspension-front-'+side,lo:.266,hi:.657};
 if(/^(Transmission\s*\|.*drive shaft|Driveshaft\s*\|)/i.test(name))return {part:'suspension-rear-'+side,lo:0,hi:.563};
 return null;
}
