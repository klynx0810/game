export function changeAvatar(imgElement) {
  const randomId = Math.floor(Math.random() * 70);
  imgElement.src = `https://i.pravatar.cc/150?img=${randomId}`;
}
