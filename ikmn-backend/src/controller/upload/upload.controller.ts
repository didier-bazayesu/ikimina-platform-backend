import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../authentication.guard';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadController {
  @Post('proof')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir,
        /* eslint-disable @typescript-eslint/no-explicit-any */
        filename: (req: any, file: any, cb: any) => {
          const uniqueSuffix = `${Date.now()}-${crypto.randomUUID()}`;
          const ext = extname(file.originalname);
          cb(null, `proof-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadProof(@UploadedFile() file: { filename: string }) {
    const port = process.env.PORT || 3000;
    const url = `http://localhost:${port}/uploads/${file.filename}`;
    return { url };
  }
}
