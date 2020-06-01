class Block {
    constructor(innerBlocks, )
}

class Sys {
    /**
     * 
     * @param {*} thetaPole angular position of ramp, state variable
     * @param {*} omegaPole angular velocity of ramp, state variable
     * @param {*} thetaCar position of car on ramp, state variable
     * @param {*} omegaCar velocity of car on ramp, state variable
     * @param {*} frictionCoeff between car and ramp
     * @param {*} springConstant linear, angular spring
     */
    constructor(thetaPole,omegaPole, thetaCar, omegaCar, frictionCoeff, springConstant) {
        this.theta = thetaPole; 
        this.omega = omegaPole; 
        this.x = thetaCar; 
        this.v = omegaCar;
        this.frictionCoeff = frictionCoeff;
        this.springConstant = springConstant;
        this.force = 0; //input
    }
    //Timestep
    static get T () {
        return 0.25; //seconds
    }
    static get POLE_LEN () {
        return 20; //meters
    }
    static get POLE_MASS () {
        return 3; //kg
    }
    static get CAR_MASS () {
        return 10; //kg
    }
    // primary axis of elliptical ramp holding car
    static get RADIUS () {
        return 10; //m
    }
  
    updateState() {
        var t_curr, o_curr, x_curr, v_curr;
        t_curr, o_curr, x_curr, v_curr = this.theta, this.omega, this.x, this.v;
        var f = this.getInputForce();

        this.theta  = this.f_theta(t_curr, o_curr);
        this.omega = this.f_omega(o_curr, x_curr);
        this.x = this.f_x(x_curr, v_curr);
        this.v = this.f_v(t_curr, o_curr, x_curr, v_curr, f);
    }

    getInputForce() {
        return 0;
    }

    getYfromX(x) {
        return Math.sqrt(Sys.RADIUS * Sys.RADIUS - x * x);
    }

    //get next thetaPole from current state
    f_thetaPole(theta, omega) {
        return theta + omega * Sys.TIMESTEP;
    }
    //get next omegaPole from current state
    f_omegaPole(thetaPole, omegaPole, thetaCar) {
        const y = this.getYfromX(x);
        const moment = (1/3)(Sys.POLE_LEN * Sys.POLE_LEN) * Sys.POLE_MASS // from pole
        + ((y + Sys.POLE_LEN)*(y + Sys.POLE_LEN) + x * x) * Sys.CAR_MASS; // from car

        const torqueGravity = (Sys.POLE_LEN / 2) * Sys.POLE_MASS * Math.sin(theta)
        + (Sys.POLE_LEN + y) * Sys.CAR_MASS * Math.sin(theta); // not exact

        const torqueSpring = this.springConstant * theta * -1;
        const torqueNet = torqueGravity + torqueSpring;
        return torqueNet / moment;

    }
    //get next thetaCar from current state
    f_thetaCar(x, v) {
        y = this.getYfromX(x);

    }
    //get next omegaCar from current state
    f_omegaCar(thetaPole, thetaCar, ) {
        const incline = theta 
    }

    static dot2D(v1, v2) {
        return v1[0] * v2[0] + v1[1] * v2[1];
    }
    static add2D(v1, v2) {
        return [v1[0] + v2[0], v1[1] + v2[1]];
    }
    


}