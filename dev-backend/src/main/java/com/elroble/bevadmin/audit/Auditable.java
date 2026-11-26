package com.elroble.bevadmin.audit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Anotación declarativa para registrar automáticamente en la tabla auditoria_autenticacion
 * quién realizó una venta, quién registró una compra, quién creó un cupón,
 * quién dio de alta una bebida o quién cerró un arqueo de caja.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {
    String module();
    String eventType();
    String description() default "";
}
