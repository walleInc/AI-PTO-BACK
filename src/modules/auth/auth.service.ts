import { Injectable, NotImplementedException } from "@nestjs/common";
import type { AuthResponse, LoginRequest, User } from "../../common/dto/openapi.types";

@Injectable()
export class AuthService {
  login(_body: LoginRequest): Promise<AuthResponse> {
    throw new NotImplementedException("login is not implemented");
  }

  logout(): Promise<void> {
    throw new NotImplementedException("logout is not implemented");
  }

  getMe(): Promise<User> {
    throw new NotImplementedException("getMe is not implemented");
  }
}
