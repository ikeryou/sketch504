import { CatmullRomCurve3, CircleGeometry, Color, Mesh, MeshBasicMaterial, Object3D, Raycaster, TubeGeometry, Vector2, Vector3 } from "three"
import { Canvas } from "../webgl/canvas"
import { MouseMgr } from "../core/mouseMgr"
import { Func } from "../core/func"
import { Val } from "../libs/val"
import { Util } from "../libs/util"
import { Tween } from "../core/tween"
export class Visual extends Canvas {

  private _con: Object3D
  private _line: Mesh;
  private _edge:Array<Mesh> = [];
  private _dot: Mesh;
  private _dotFrame: Mesh;
  private _dotPosRate: Val = new Val(0);
  private _isHover: boolean = false;
  private _isActive: boolean = false;
  private _basePos: Array<Vector3> = []
  private _btnColor: Color = new Color(0xffffff)
  private _defaultBgColor: Color = new Color(0xcccccc)
  private _activeBgColor: Color = new Color(0x76d672)
  private _lineMat: MeshBasicMaterial
  private _noise: Array<number> = []
  private _ray: Raycaster = new Raycaster()

  constructor(opt:any) {
    super(opt)

    this._con = new Object3D()
    this.mainScene.add(this._con)

    this._lineMat = new MeshBasicMaterial({
      depthTest: false,
      color: this._activeBgColor,
    })

    for(let i = 0; i < 2; i++) {
      const edge = new Mesh(
        new CircleGeometry(0.5, 64),
        this._lineMat
      );
      this._con.add(edge);
      this._edge.push(edge);
    }

    this._dotFrame = new Mesh(
      new CircleGeometry(0.5, 64),
      new MeshBasicMaterial({
        depthTest: false,
        color: new Color(0xbbbbbb),
      })
    );
    this._con.add(this._dotFrame);
    this._dotFrame.renderOrder = 1;
    this._dotFrame.visible = false

    this._dot = new Mesh(
      new CircleGeometry(0.5, 64),
      new MeshBasicMaterial({
        depthTest: false,
        color: this._btnColor,
      })
    );
    this._con.add(this._dot);
    this._dot.renderOrder = 2;

    this._line = new Mesh(
      this._makeLineGeo(),
      this._lineMat
    );
    this._con.add(this._line);

    this._setClickEvent(this.el, () => {
      this._eClick()
    })

    this._resize()
  }

  private _eClick():void {
    if(this._isHover) {
      this._isActive = !this._isActive
      Tween.a(this._dotPosRate, {
        val: this._isActive ? 1 : 0
      }, 0.75, 0, Tween.ExpoEaseInOut)
    }
  }

  _update():void {
    super._update()

    const col = this._defaultBgColor.clone().lerp(this._activeBgColor.clone(), this._dotPosRate.val)
    // col.offsetHSL(0, 0, this._isHover ? 0.1 : 0)
    this._lineMat.color = col;

    this._line.geometry.dispose()
    this._line.geometry = this._makeLineGeo()

    // マウス判定
    const mousePos = new Vector2(MouseMgr.instance.normal.x, MouseMgr.instance.normal.y * -1)
    this._ray.setFromCamera(mousePos, this.cameraOrth)
    const intersects = this._ray.intersectObjects([this._line]);
    if(intersects.length > 0) {
      document.body.style.cursor = 'pointer'
      this._isHover = true
    } else {
      document.body.style.cursor = 'default'
      this._isHover = false
    }
    
    if(this.isNowRenderFrame()) {
      this._render()
    }
  }

  _render():void {
    this.renderer.setClearColor(0xffffff, 1)
    this.renderer.render(this.mainScene, this.cameraOrth)
  }

  isNowRenderFrame():boolean {
    return true
  }

  _resize():void {
    super._resize()

    const w = Func.sw()
    const h = Func.sh()

    this.renderSize.width = w
    this.renderSize.height = h

    this._updateOrthCamera(this.cameraOrth, w, h)

    let pixelRatio:number = window.devicePixelRatio || 1
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(w, h)
  }

  // ---------------------------------
  private _makeLineGeo(): TubeGeometry {
    const sw = Func.sw();
    const sh = Func.sh();

    if(this._basePos.length == 0) {
      const len = 4
      const range = sw * 0.45
      for(let i = 0; i < len; i++) {
        this._basePos.push(new Vector3(Util.map(i, -range, range, 0, len - 1), 0, 0))
        this._noise.push(Util.random2(0.2, 1.5))
      }
    }

    const arr: Array<Vector3> = [];

    

    this._basePos.forEach((val,i) => {
      const rangeX = 10
      const rangeY = Math.min(sw, sh) * 0.2
      
      const n = this._noise[i]
      const rad = Util.radian(i * (360 / this._basePos.length) * 1 + this._c * 2)
      arr.push(new Vector3(
        val.x + Math.sin(rad * n) * rangeX,
        val.y + Math.sin(rad * n) * rangeY,
        0,
      ))
    })

    const width = 50;

    const edgeSize = width * 1.75;
    this._edge[0].scale.set(edgeSize, edgeSize, 1);
    this._edge[1].scale.set(edgeSize, edgeSize, 1);

    this._edge[0].position.x = arr[0].x;
    this._edge[0].position.y = arr[0].y;

    this._edge[1].position.x = arr[arr.length - 1].x;
    this._edge[1].position.y = arr[arr.length - 1].y;

    const btnSize = width * 1.5;
    this._dot.scale.set(btnSize, btnSize, 1);

    const sampleClosedSpline = new CatmullRomCurve3(arr, false);
    const tube = new TubeGeometry(sampleClosedSpline, 124, width, 3, false);

    const dotPos = sampleClosedSpline.getPointAt(this._dotPosRate.val);
    this._dot.position.copy(dotPos);

    this._dotFrame.scale.copy(this._dot.scale)
    this._dotFrame.scale.multiplyScalar(1.05);
    this._dotFrame.position.copy(this._dot.position)

    return tube;
  }
}