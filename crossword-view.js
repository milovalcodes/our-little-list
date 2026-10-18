import {entryCells} from './daily-puzzles.js';
import {escapeHtml as esc} from './ui-helpers.js';

// Larger targets for the current word keep a large board usable on a phone.
// These buttons select the same squares, and never reveal correctness.
export function crosswordFocus(puzzle,index,letters,cursor,attribute){
 const e=puzzle.entries[index];
 return `<div class="crossword-focus" role="group" aria-label="Current answer, ${e.word.length} letters">${entryCells(puzzle,index).map((cell,i)=>`<button type="button" ${attribute}="${cell}" tabindex="${cursor.cell===cell?0:-1}" class="${cursor.cell===cell?'current':''}" aria-label="Letter ${i+1}, ${letters[cell]||'empty'}">${esc(letters[cell]||'·')}</button>`).join('')}</div>`;
}
export function revealFocusedLetter(host){
 const strip=host.querySelector('.crossword-focus'),button=strip?.querySelector('.current');
 if(!button)return;
 const left=button.offsetLeft-strip.offsetLeft;
 strip.scrollLeft=Math.max(0,left-(strip.clientWidth-button.offsetWidth)/2);
}
export function themeCaption(puzzle){return puzzle.themeDescription?`<p class="crossword-theme-detail">${esc(puzzle.themeDescription)} The marked theme clue is the longer answer that brings it together.</p>`:'';}
