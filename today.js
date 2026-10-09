import {bootPage} from './page-boot.js';
// Preserve old bookmarks and notification anchors, without another dashboard.
const {viewer}=await bootPage();
location.replace(viewer+'.html'+location.hash);
