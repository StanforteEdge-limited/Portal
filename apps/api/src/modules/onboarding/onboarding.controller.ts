import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';
import { SubmitOnboardingFormDto, UpdateOnboardingDto } from './dto/onboarding.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@ApiTags('Onboarding')
@ApiBearerAuth('bearer')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('me')
  me(@Req() req: any) {
    return this.onboardingService.getMyOnboarding(req.user.id);
  }

  @Patch('me')
  update(@Req() req: any, @Body() dto: UpdateOnboardingDto) {
    return this.onboardingService.updateMyOnboarding(req.user.id, dto);
  }

  @Post('me/forms')
  submitForm(@Req() req: any, @Body() dto: SubmitOnboardingFormDto) {
    return this.onboardingService.submitForm(req.user.id, dto);
  }
}
