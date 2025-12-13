import fs from 'fs';
import path from 'path';

export const getImageLink = (slug, imageName) => {
  if (!imageName) return null;

  // Simulate checking for file existence in public folder
  // In a real scenario, this would check /public/images/...
  // For now, we return a standard markdown link format assuming the user will place files there.
  
  const publicPath = `/images/${slug}/${imageName}`;
  const localCheckPath = path.join(process.cwd(), 'public', 'images', slug, imageName);

  // We perform a "soft" check - we return the link regardless, but maybe log a warning if missing?
  // User instruction: "take image in public folder and add link in .md file"
  
  return `![${imageName}](${publicPath})`;
};

export const ensurePublicDir = () => {
   const dir = path.join(process.cwd(), 'public', 'images');
   if (!fs.existsSync(dir)){
       fs.mkdirSync(dir, { recursive: true });
   }
}
