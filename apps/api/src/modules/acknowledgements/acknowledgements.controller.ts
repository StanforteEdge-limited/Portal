import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { AcknowledgementsService } from './acknowledgements.service';
import { CreateAcknowledgementDto } from './dto/create-acknowledgement.dto';
import { ListAcknowledgementsDto } from './dto/list-acknowledgements.dto';
import { RevokeAcknowledgementDto } from './dto/revoke-acknowledgement.dto';

@Controller('acknowledgements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Acknowledgements')
@ApiBearerAuth('bearer')
export class AcknowledgementsController {
  constructor(private readonly acknowledgementsService: AcknowledgementsService) {}

  @Get('me')
  @Permissions('requests.view')
  listMine(@Req() req: any, @Query() query: ListAcknowledgementsDto) {
    return this.acknowledgementsService.listMine(req.user.id, query);
  }

  @Get()
  @Permissions('users.manage')
  listAll(@Query() query: ListAcknowledgementsDto) {
    return this.acknowledgementsService.listAll(query);
  }

  @Get(':id')
  @Permissions('requests.view')
  get(@Param('id') id: string) {
    return this.acknowledgementsService.getById(id);
  }

  @Post()
  @Permissions('requests.view')
  acknowledge(@Req() req: any, @Body() dto: CreateAcknowledgementDto) {
    return this.acknowledgementsService.acknowledge(req.user.id, dto);
  }

  @Patch(':id/revoke')
  @Permissions('users.manage')
  revoke(@Param('id') id: string, @Body() dto: RevokeAcknowledgementDto) {
    return this.acknowledgementsService.revoke(id, dto);
  }
}
