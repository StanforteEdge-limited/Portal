import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '$modules/auth/auth/dto/login.dto';
import { ChangePasswordDto } from '$modules/auth/auth/dto/change-password.dto';
import { RefreshDto } from '$modules/auth/auth/dto/refresh.dto';
import { ForgotPasswordDto } from '$modules/auth/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '$modules/auth/auth/dto/reset-password.dto';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { AuthStatusResponseDto, LoginResponseDto } from '$modules/auth/auth/dto/auth-response.dto';
import { AcceptInviteDto } from '$modules/auth/auth/dto/accept-invite.dto';
import { SwitchTenantDto } from '$modules/auth/auth/dto/switch-tenant.dto';
import type { Response } from 'express';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBody({
    type: LoginDto,
    examples: {
      default: {
        value: { email: 'olalekan@stanforteedge.com', password: 'ChangeMe123!' }
      }
    }
  })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOkResponse({ type: AuthStatusResponseDto })
  status(@Req() req: any) {
    return this.authService.status(req.user?.id);
  }

  @Get('tenants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  listTenants(@Req() req: any) {
    return this.authService.listTenants(req.user?.id);
  }

  @Post('tenants/switch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  switchTenant(
    @Req() req: any,
    @Body() dto: SwitchTenantDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.switchTenant(req.user?.id, dto.tenant_id, res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req.user?.id, res);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiBody({
    type: ChangePasswordDto,
    examples: {
      default: {
        value: {
          current_password: 'ChangeMe123!',
          new_password: 'NewStrong123!',
          confirm_password: 'NewStrong123!'
        }
      }
    }
  })
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user?.id, dto);
  }

  @Post('refresh')
  @ApiBody({
    type: RefreshDto,
    examples: {
      default: {
        value: { refresh_token: 'your-refresh-token' }
      }
    }
  })
  refresh(@Req() req: any, @Body() dto: RefreshDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(dto, req, res);
  }

  @Post('forgot-password')
  @ApiBody({
    type: ForgotPasswordDto,
    examples: {
      default: {
        value: { email: 'olalekan@stanforteedge.com' }
      }
    }
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiBody({
    type: ResetPasswordDto,
    examples: {
      default: {
        value: { token: 'reset-token-from-email', new_password: 'NewStrong123!' }
      }
    }
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('google')
  async googleLogin(@Res() res: Response) {
    const url = await this.authService.googleAuthUrl();
    (res as any).redirect(url);
  }

  @Get('google/callback')
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    const redirectUrl = await this.authService.handleGoogleCallback(code, res as any);
    (res as any).redirect(redirectUrl);
  }

  @Post('accept-invite')
  @ApiBody({
    type: AcceptInviteDto,
    examples: {
      default: {
        value: { token: 'invite-token-from-email', new_password: 'ChangeMe123!', confirm_password: 'ChangeMe123!' }
      }
    }
  })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }
}
