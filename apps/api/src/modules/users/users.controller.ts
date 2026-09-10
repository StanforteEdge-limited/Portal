import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller()
@ApiTags('Users')
@ApiBearerAuth('bearer')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getMyProfile(@Req() req: any) {
    return this.usersService.getMyProfile(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: any) {
    return this.usersService.getMyProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    type: UpdateProfileDto,
    examples: {
      default: {
        value: {
          first_name: 'Olalekan',
          last_name: 'Adebayo',
          phone: '+2348000000000',
          occupation: 'Operations Manager'
        }
      }
    }
  })
  updateMyProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMyProfile(req.user.id, dto);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.manage')
  list(@Query() query: Record<string, any>) {
    return this.usersService.listUsers(query);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Create user and optionally assign initial roles' })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      withRoles: {
        value: {
          username: 'jdoe',
          email: 'jdoe@stanforteedge.com',
          status: 'pending',
          set_password: false,
          send_invite: true,
          send_welcome_email: true,
          type: 'staff',
          first_name: 'John',
          last_name: 'Doe',
          roles: ['staff']
        }
      }
    }
  })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Get a user by id' })
  getById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Update a user profile by id' })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      updateUser: {
        value: {
          first_name: 'John',
          last_name: 'Doe',
          type: 'staff',
          status: 'active',
          set_password: true,
          password: 'ChangeMe123!'
        }
      }
    }
  })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }

  @Get('users/:id/roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Get assigned roles for a user' })
  getRoles(@Param('id') id: string) {
    return this.usersService.getUserRoles(id);
  }

  @Post('users/:id/roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Replace assigned roles for a user' })
  @ApiBody({
    type: AssignUserRolesDto,
    examples: {
      adminAndFinance: {
        value: { roles: ['staff', 'accountant', 'finance_manager'] }
      }
    }
  })
  setRoles(@Param('id') id: string, @Body() dto: AssignUserRolesDto) {
    return this.usersService.setUserRoles(id, dto);
  }

  @Post('users/:id/invite')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('users.manage')
  @ApiOperation({ summary: 'Send invite email to user for password setup' })
  @ApiBody({
    type: InviteUserDto,
    examples: {
      default: {
        value: {
          message: 'Welcome to StanforteEdge. Use this link to activate your account.'
        }
      }
    }
  })
  inviteUser(@Param('id') id: string, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(id, dto);
  }
}
