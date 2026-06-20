"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type formDataType = {
  name: string;
  email: string;
  password: string;
};

export const registerNewUser = async (formData: formDataType) => {
  const { name, email, password } = formData;

  //Basic validation- to avoid submission of empty fields
  if (!name.trim() || !email.trim() || !password.trim()) {
    return {
      success: false,
      error: "All input fields are required",
    };
  }

  //Check if user doesnt already exist
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return {
      success: false,
      error: " This account already exist ",
    };
  }
  //hashing the password before storing it
  const hashedPassword = await bcrypt.hash(password, 10);

  //create user in the database
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  //
  return { success: true, userId: user.id };
};
