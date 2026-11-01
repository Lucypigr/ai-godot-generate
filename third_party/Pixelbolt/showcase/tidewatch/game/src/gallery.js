// Lists the APNG previews written by tools/build-assets.mjs.
const items = [
  ['keeper-walk-d', 'Keeper walk'], ['keeper-attack-r', 'Cutlass swing'], ['keeper-attack-d', 'Downward strike'], ['crab-snap', 'Crab snap'],
  ['jelly-hop', 'Brine jelly hop'], ['shore-surf-0', 'Surf cycle'], ['lighthouse-night', 'Lantern room'], ['flora-palm', 'Palm sway'],
  ['fx-leaves', 'Cut grass'], ['fx-poof', 'Poof'], ['fx-splash', 'Splash'], ['slash-slash-d', 'Slash arc'], ['gull-flap', 'Gull'], ['fisher-idle', 'Old Wren'], ['pickups-flint', 'Sunflint']
];
const gallery = document.getElementById('gallery');
for (const [file, label] of items) {
  const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
  img.src = `./gallery/${file}.png`; img.alt = label; img.loading = 'lazy'; caption.textContent = label;
  figure.append(img, caption); gallery.append(figure);
}
