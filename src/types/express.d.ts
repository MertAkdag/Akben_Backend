declare global {
  namespace Express {
    interface Request {
      userId: string;
      userRole?: string;
      cariId?: string;
    }
  }
}

export {};
