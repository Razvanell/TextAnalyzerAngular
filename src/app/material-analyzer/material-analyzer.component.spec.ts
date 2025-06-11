import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaterialAnalyzerComponent } from './material-analyzer.component';

describe('MaterialAnalyzerComponent', () => {
  let component: MaterialAnalyzerComponent;
  let fixture: ComponentFixture<MaterialAnalyzerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialAnalyzerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaterialAnalyzerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
