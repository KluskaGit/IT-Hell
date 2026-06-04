import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { CvApiService } from './cv-api.service';
import { environment } from '../../../environments/environment';
import { LookupDto } from '../models/offers.models';

describe('CvApiService', () => {
  let service: CvApiService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/cv`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });

    service = TestBed.inject(CvApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('uploadCv should call POST /cv/upload with multipart FormData', () => {
    const file = new File(['test-cv-content'], 'cv.pdf', {
      type: 'application/pdf',
    });

    const mockResponse: LookupDto[] = [
      { id: 'tech-1', name: 'Angular' },
      { id: 'tech-2', name: 'TypeScript' },
    ];

    service.uploadCv(file).subscribe((result) => {
      expect(result).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${baseUrl}/upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeInstanceOf(FormData);

    const formData = req.request.body as FormData;
    expect(formData.get('file')).toBe(file);

    req.flush(mockResponse);
  });

  it('uploadCv should preserve file name in FormData', () => {
    const file = new File(['dummy'], 'my-cv.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    service.uploadCv(file).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/upload`);
    expect(req.request.method).toBe('POST');

    const formData = req.request.body as FormData;
    const sentFile = formData.get('file') as File;

    expect(sentFile).toBeTruthy();
    expect(sentFile.name).toBe('my-cv.docx');
  });
});