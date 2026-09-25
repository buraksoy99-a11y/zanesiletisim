import React from 'react';

// Line illustrations that draw themselves when their row scrolls into view (see .in-view in style.css).
function PhoneArt() {
  return <svg className="art" viewBox="0 0 220 160" aria-hidden="true" focusable="false">
    <path className="ln" pathLength="1" d="M40 44H86V116L80.5 111L75 116L69.5 111L64 116L58.5 111L53 116L47.5 111L40 116Z" />
    <path className="thin" d="M48 58H72M48 68H66" />
    {[48, 58, 68].map((x, i) => <rect key={x} className={`tick red t${i + 1}`} x={x} y="84" width="7" height="7" rx="1.5" />)}
    <path className="ln d2" pathLength="1" d="M94 14H134Q146 14 146 26V134Q146 146 134 146H94Q82 146 82 134V26Q82 14 94 14Z" />
    <path className="thin" d="M106 24H122M104 136H124" />
    <text className="g5" x="114" y="66">5G</text>
    {[[95,104,14],[105,96,22],[115,88,30],[125,80,38]].map(([x, y, h]) => <rect key={x} className="bar red" x={x} y={y} width="7" height={h} rx="2" />)}
    <path className="arc red-ln" d="M160 62Q168 74 160 86" /><path className="arc a2 red-ln" d="M170 52Q184 74 170 96" /><path className="arc a3 red-ln" d="M180 42Q200 74 180 106" />
  </svg>;
}

function AccessoryArt() {
  return <svg className="art" viewBox="0 0 220 160" aria-hidden="true" focusable="false">
    <path className="ln open" pathLength="1" d="M30 98V84Q30 46 66 46Q102 46 102 84V98" />
    <path className="ln d2" pathLength="1" d="M24 90H40V134H24Q18 134 18 128V96Q18 90 24 90Z" />
    <path className="ln d2" pathLength="1" d="M92 90H108Q114 90 114 96V128Q114 134 108 134H92Z" />
    <path className="ln d3" pathLength="1" d="M152 34H186Q192 34 192 40V70Q192 76 186 76H152Q146 76 146 70V40Q146 34 152 34Z" />
    <path className="thin" d="M160 34V20M178 34V20" />
    <path className="ln open d3" pathLength="1" id="cable-path" d="M169 76C169 96 134 92 134 110C134 122 140 130 144 132" />
    <path className="ln d3" pathLength="1" d="M148 118H186Q190 118 190 122V142Q190 146 186 146H148Q144 146 144 142V122Q144 118 148 118Z" />
    <path className="thin" d="M195 126V138" />
    <rect className="fill red" x="149" y="123" width="36" height="18" rx="2" />
    <circle className="dot red" r="4.5"><animateMotion dur="1.6s" repeatCount="indefinite" rotate="auto"><mpath href="#cable-path" /></animateMotion></circle>
  </svg>;
}

function OperatorArt() {
  return <svg className="art" viewBox="0 0 220 160" aria-hidden="true" focusable="false">
    <path className="ln" pathLength="1" d="M30 36H72L88 52V124Q88 128 84 128H34Q30 128 30 124Z" />
    <path className="ln d2" pathLength="1" d="M44 64H74V96H44Z" />
    <path className="thin" d="M44 80H74M59 64V96" />
    <path className="flow" d="M92 96C112 96 114 116 134 116" />
    <path className="ln d3" pathLength="1" d="M138 104H196Q202 104 202 110V124Q202 130 196 130H138Q132 130 132 124V110Q132 104 138 104Z" />
    <path className="thin" d="M148 104L140 80M186 104L194 80" />
    <circle className="led" cx="146" cy="117" r="2.6" /><circle className="led" cx="156" cy="117" r="2.6" /><circle className="led blink red" cx="166" cy="117" r="2.6" />
    <circle className="dot red" cx="167" cy="76" r="3.5" />
    <path className="arc red-ln" d="M157 68Q167 60 177 68" /><path className="arc a2 red-ln" d="M149 58Q167 44 185 58" /><path className="arc a3 red-ln" d="M141 48Q167 28 193 48" />
  </svg>;
}

export const serviceArt = {Telefon:PhoneArt, Aksesuar:AccessoryArt, 'Vodafone işlemleri':OperatorArt};

// "25" drawn as two metro lines with their stations; a car shuttles along each.
export function Metro25() {
  const shuttle = (path, dur, begin) => <rect className="m-car" x="-9" y="-6" width="18" height="12" rx="5">
    <animateMotion dur={dur} begin={begin} repeatCount="indefinite" rotate="auto" keyPoints="0;1;0" keyTimes="0;.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"><mpath href={path} /></animateMotion>
  </rect>;
  return <svg className="metro25" viewBox="0 0 440 300" aria-hidden="true" focusable="false">
    <path className="m-line" id="m2" pathLength="1" d="M40 88L82 46H146L188 88V118L48 258H194" />
    <path className="m-line l5" id="m5" pathLength="1" d="M404 46H252V142H356L398 184V216L356 258H246" />
    {[[146,46,1],[188,118,2],[252,142,4],[398,216,5]].map(([cx, cy, i]) => <circle key={cx} className="m-mini" cx={cx} cy={cy} r="5" style={{'--i':i}} />)}
    {[[40,88,0],[194,258,3],[404,46,3],[246,258,6]].map(([cx, cy, i]) => <circle key={cx} className="m-stop" cx={cx} cy={cy} r="12" style={{'--i':i}} />)}
    {shuttle('#m2', '7s', '0s')}
    {shuttle('#m5', '8s', '-3s')}
  </svg>;
}
