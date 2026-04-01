// import type { DoctorRegisterDto } from "@devloggers/contracts";
// import { authRoutes } from "@devloggers/contracts";

import { AUTH, MerchantRegisterDto, LoginDto, RegisterAsCustomerContract, GuestCustomer, UserData, VerifyOtpDto, SendOtpDtoContract } from "@devloggers/contracts";

import { ApiService } from "../core/apiService";
export class AuthApi extends ApiService {
    registerAsMerchant = (dto: MerchantRegisterDto) => {
        return this.post(AUTH.REGISTER, {
            body: JSON.stringify(dto),
            credentials: 'include',
        });
    }

    registerAsCustomer = (dto: RegisterAsCustomerContract) => {
        return this.post(AUTH.REGISTER, {
            body: JSON.stringify(dto),
            credentials: 'include',
        });
    }

    loginAsMerchant = (dto: LoginDto) => {
        return this.post<UserData>(AUTH.LOGIN, {
            body: JSON.stringify(dto),
            credentials: 'include',
        });
    }

    registerAsGuest = (dto: GuestCustomer) => {
        return this.post(AUTH.REGISTER_AS_GUEST, {
            body: JSON.stringify(dto),
            credentials: 'include',
        });
    }

    loginWithOtp = (dto: VerifyOtpDto) => {
        return this.post<UserData>(AUTH.VERIFY_OTP, {
            body: JSON.stringify(dto),
            credentials: 'include',
        });
    }

    // Send OTP => Login With OTP
    sendOtp = (dto: SendOtpDtoContract) => {
        return this.post(AUTH.LOGIN_WITH_OTP, {
            body: JSON.stringify(dto),
            credentials: 'include',
        });
    }

    me = () => {
        return this.get(AUTH.ME, {
            credentials: 'include',
        });
    }
    logout = () => {
        return this.post(AUTH.LOGOUT, {
            credentials: 'include',
        });
    }

}