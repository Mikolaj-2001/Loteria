/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type UserCreateInput = {
  userName: string;
  email: string;
  password: string;
  encryptionKey?: string;
  action?: string | null;
  updatedAction?: string | null;
};

type UserUpdateInput = {
  userName?: string;
  email?: string;
  password?: string;
  encryptionKey?: string | null;
  action?: string | null;
  updatedAction?: string | null;
};

type ActionCreateInput = {
  userID: string;
  option: number;
  description: string;
  userId?: string | null;
};

type ActionUpdateInput = {
  option?: number;
  description?: string;
  userID?: string;
  userId?: string | null;
};

export async function connectPrismaClient(): Promise<void> {
  await prisma.$connect(); //dolar oznacza tu połączenie z klientem Prisma
}

export async function disconnectPrismaClient(): Promise<void> {
  await prisma.$disconnect();
}

export function getPrismaClient(): PrismaClient {
  return prisma;
}

export function getAllUsers() {
  return prisma.user.findMany({
    include: {
      actions: true,
    },
  });
}

export function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { actions: true },
  });
}

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: { actions: true },
  });
}

export function getUserByUserName(userName: string) {
  return prisma.user.findUnique({
    where: { userName },
    include: { actions: true },
  });
}

export function findUserByIdentifier(identifier: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { userName: identifier }],
    },
    include: { actions: true },
  });
}

export function createUser(userData: UserCreateInput) {
  return prisma.user.create({
    data: {
      userName: userData.userName,
      email: userData.email,
      password: userData.password,
      encryptionKey: userData.encryptionKey,
      action: userData.action ?? null,
      updatedAction: userData.updatedAction ?? null,
    },
  });
}

export function updateUserById(userId: string, userData: UserUpdateInput) {
  return prisma.user.update({
    where: { id: userId },
    data: userData,
  });
}

export function updateUserByActionId(
  actionId: string,
  userData: UserUpdateInput,
) {
  return prisma.user.updateMany({
    //stosujemy updateMany, ponieważ może istnieć wiele użytkowników powiązanych z tym samym actionId. W przypadku updateMany, jeśli istnieje więcej niż jeden użytkownik spełniający warunek, wszystkie zostaną zaktualizowane. Jeśli chcemy zaktualizować tylko jednego użytkownika, powinniśmy użyć update zamiast updateMany.
    where: { action: actionId },
    data: userData,
  });
}

export function setCurrentUserAction(userId: string, actionId: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { action: actionId },
  });
}

export function setUserUpdatedActionInfo(
  userId: string,
  updatedAction: string | null,
) {
  return prisma.user.update({
    where: { id: userId },
    data: { updatedAction },
  });
}

export function deleteUserById(userId: string) {
  return prisma.user.delete({
    where: { id: userId },
  });
}

export function deleteUserByEmail(email: string) {
  return prisma.user.delete({
    where: { email },
  });
}

export function getAllActions() {
  return prisma.action.findMany({
    include: { user: true },
  });
}

export function getActionById(actionId: string) {
  return prisma.action.findUnique({
    where: { id: actionId },
    include: { user: true }, //include oznacza, że przy pobieraniu akcji zostaną również pobrane powiązane dane użytkownika
  });
}

export function createAction(actionData: ActionCreateInput) {
  return prisma.action.create({
    data: {
      userID: actionData.userID,
      option: actionData.option,
      description: actionData.description,
      userId: actionData.userId ?? null,
    },
  });
}

export function updateActionById(
  actionId: string,
  actionData: ActionUpdateInput,
) {
  return prisma.action.update({
    where: { id: actionId },
    data: actionData,
  });
}

export function deleteActionById(actionId: string) {
  return prisma.action.delete({
    where: { id: actionId },
  });
}

export function createUserWithAction(
  userData: UserCreateInput,
  actionData: Omit<ActionCreateInput, 'userID'>, // ten fragment kodu oznacza, że typ ActionCreateInput jest używany, ale właściwość userID jest pomijana. Oznacza to, że actionData nie będzie zawierać pola userID, ponieważ zostanie ono ustawione automatycznie na podstawie utworzonego użytkownika.
) {
  return prisma.$transaction(async (tx) => {
    //została użyta metoda $transaction, która pozwala na wykonanie wielu operacji w ramach jednej transakcji. Dzięki temu, jeśli którakolwiek z operacji zakończy się niepowodzeniem, wszystkie zmiany zostaną wycofane, a baza danych pozostanie w spójnym stanie.
    const user = await tx.user.create({
      data: {
        userName: userData.userName,
        email: userData.email,
        password: userData.password,
        encryptionKey: userData.encryptionKey,
        action: null,
        updatedAction: userData.updatedAction ?? null,
      },
    });

    const action = await tx.action.create({
      data: {
        userID: user.id, // tutaj ustawiamy userID akcji na ID utworzonego użytkownika bazując na wyniku wcześniejszej operacji tworzenia użytkownika.
        option: actionData.option,
        description: actionData.description,
        userId: actionData.userId ?? null,
      },
    });

    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { action: action.id },
    });

    return { user: updatedUser, action };
  });
}

export function assignActionToUser(userId: string, actionId: string) {
  return prisma.$transaction(async (tx) => {
    const action = await tx.action.update({
      where: { id: actionId },
      data: { userID: userId },
    });

    const user = await tx.user.update({
      where: { id: userId },
      data: { action: action.id },
    });

    return { user, action };
  });
}

export function updateActionAndUserSummary(
  actionId: string,
  actionData: ActionUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const action = await tx.action.update({
      where: { id: actionId },
      data: actionData,
    });

    await tx.user.update({
      where: { id: action.userID },
      data: {
        updatedAction: `Użytkownik wybrał ${action.option}`,
      },
    });

    return action;
  });
}

export function removeActionAndUnlinkUsers(actionId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { action: actionId },
      data: { action: null },
    });

    return tx.action.delete({
      where: { id: actionId },
    });
  });
}

export function deleteUserAndActions(userId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.action.deleteMany({
      where: { userID: userId },
    });

    return tx.user.delete({
      where: { id: userId },
    });
  });
}
