export function changeBackground(appElement) {
  const colors = ["#222", "#445", "#663", "#34495e", "#2c3e50", "#16a085", "#8e44ad"];
  appElement.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
}
