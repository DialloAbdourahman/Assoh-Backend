let users: Array<object> = [];

const addUser = (userId: string, socketId: string) => {
  // Check if user is existing in the array of users
  const userExists = users.some((user: any) => user.userId === userId);

  if (!userExists) {
    users.push({ userId, socketId });
  }

  return users;
};

const removeUser = (socketId: string) => {
  users = users.filter((user: any) => {
    return user.socketId !== socketId;
  });

  return users;
};

const getUser = (userId: string) => {
  const user = users.find((user: any) => user.userId === userId);
  return user;
};

module.exports = { addUser, removeUser, getUser };
