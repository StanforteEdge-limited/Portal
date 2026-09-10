import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { SetGroupMemberScopesDto } from './dto/set-group-member-scopes.dto';
import { SetGroupOrganizationsDto } from './dto/set-group-organizations.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Groups')
@ApiBearerAuth('bearer')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List groups across all group types' })
  @Permissions('groups.view')
  list(@Query() query: Record<string, any>) {
    return this.groupsService.list(query);
  }

  @Get('for-user')
  @ApiOperation({ summary: 'Get groups for the current user' })
  forUser(@Req() req: any, @Query() query: Record<string, any>) {
    return this.groupsService.forUser(req.user?.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group details by id' })
  @Permissions('groups.view')
  get(@Param('id') id: string) {
    return this.groupsService.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a group' })
  @Permissions('groups.manage')
  create(@Req() req: any, @Body() dto: CreateTeamDto) {
    return this.groupsService.create(req.user?.id, dto);
  }

  @Post(':id')
  @ApiOperation({ summary: 'Update a group' })
  @Permissions('groups.manage')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.groupsService.update(id, req.user?.id, dto);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member to a group' })
  @Permissions('groups.manage')
  addMember(@Req() req: any, @Param('id') id: string, @Body() dto: AddGroupMemberDto) {
    return this.groupsService.addMember(id, req.user?.id, dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from a group' })
  @Permissions('groups.manage')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.groupsService.removeMember(id, userId);
  }

  @Post(':id/organizations')
  @ApiOperation({ summary: 'Set organizations covered by a group' })
  @Permissions('groups.manage')
  setOrganizations(@Param('id') id: string, @Body() dto: SetGroupOrganizationsDto) {
    return this.groupsService.setOrganizations(id, dto);
  }

  @Post(':id/members/:userId/scopes')
  @ApiOperation({ summary: 'Set organization scopes for a group member' })
  @Permissions('groups.manage')
  setMemberScopes(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: SetGroupMemberScopesDto
  ) {
    return this.groupsService.setMemberScopes(id, userId, dto);
  }
}
