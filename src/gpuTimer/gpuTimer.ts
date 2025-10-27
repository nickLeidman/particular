import { Engine } from "../engine/engine";

type TimerResultHandler = (label: string, nanoseconds: number) => void;


export class GpuTimer {
  private gl: WebGL2RenderingContext;
  private ext: any;
  private pending: Array<{ q: WebGLQuery; label: string }> = [];
  private warned = false;

  constructor(private engine: Engine) {
    this.gl = engine.gl;
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
  }

  get supported(): boolean {
    return !!this.ext;
  }

  begin(label = 'region'): { q: WebGLQuery; label: string } | null {
    if (!this.ext) {
      if (!this.warned) {
        this.warned = true;
        // console.warn('EXT_disjoint_timer_query_webgl2 not available');
      }
      return null;
    }
    const q = this.gl.createQuery();
    if (!q) return null;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    return { q, label };
  }

  end(handle: { q: WebGLQuery; label: string } | null): void {
    if (!this.ext || !handle) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(handle);
  }

  poll(onResult?: TimerResultHandler): void {
    if (!this.ext || this.pending.length === 0) return;

    const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT) as boolean;

    for (let i = this.pending.length - 1; i >= 0; --i) {
      const { q, label } = this.pending[i];
      const available = this.gl.getQueryParameter(q, this.gl.QUERY_RESULT_AVAILABLE) as boolean;
      if (!available) continue;

      let ns: number | null = null;
      if (!disjoint) {
        ns = this.gl.getQueryParameter(q, this.gl.QUERY_RESULT) as number; // nanoseconds
      }

      this.gl.deleteQuery(q);
      this.pending.splice(i, 1);

      if (ns != null && onResult) onResult(label, ns);
    }
  }

  // Convenience wrapper to time an inline block
  measure(label: string, drawFn: () => void, onResult?: TimerResultHandler): void {
    const h = this.begin(label);
    drawFn();
    this.end(h);
    this.poll(onResult);
  }

  dispose(): void {
    for (const { q } of this.pending) {
      this.gl.deleteQuery(q);
    }
    this.pending.length = 0;
  }
}