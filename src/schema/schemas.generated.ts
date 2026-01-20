/**
 * Auto-generated schema constants
 *
 * DO NOT EDIT MANUALLY - Run "npm run generate:schemas" to regenerate
 *
 * Generated: 2026-01-20T20:10:35.480Z
 */

export const CONTAINER_RNG = `<?xml version="1.0"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0"
         ns="urn:oasis:names:tc:opendocument:xmlns:container"
         datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes">
	<start>
		<element name="container">
  			<attribute name="version">
  				<text/>
  			</attribute>
			<element name="rootfiles">
				<oneOrMore>
					<element name="rootfile">
	  					<attribute name="full-path">
	  						<text/>
	  					</attribute>
	  					<attribute name="media-type">
	  						<text/>
	  					</attribute>
					</element>
      			</oneOrMore>
      		</element>
    	</element>
   </start>
</grammar>`;

export const EPUB_NAV_30_RNC = ` 
   default namespace = "http://www.w3.org/1999/xhtml"
   namespace epub = "http://www.idpf.org/2007/ops"
   
 
# #####################################################################
##  RELAX NG Schema for EPUB: EPUB Navigation Documents               #
# #####################################################################
   
   include "epub-xhtml-30.rnc" {   
        nav.attrs = nav.attrs.noepubtype
   }

   ## "reset" the definition of nav.attrs to what it was
   ## before epub:type was set to augment common.attrs.basic
   nav.attrs.noepubtype = 
     ( common.attrs.id?
     & common.attrs.class?
     & common.attrs.title?
     & common.attrs.base?
     & common.attrs.space?
     & common.attrs.i18n
     & common.attrs.present
     & common.attrs.other
     & (	common.attrs.aria.implicit.navigation
			|	common.attrs.aria.landmark.navigation
			|	common.attrs.aria.role.doc-index
			|	common.attrs.aria.role.doc-pagelist
			|	common.attrs.aria.role.doc-toc
			)?
		)

   html5.headings.class = hgroup.elem | h1.elem | h2.elem | h3.elem | h4.elem | h5.elem | h6.elem
   
   epub.nav = element nav { epub.type.attr & nav.attrs.noepubtype & epub.nav.content }
   epub.nav.content = html5.headings.class?, epub.nav.ol     
   
   epub.nav.ol = element ol { ol.attrs & epub.nav.ol.content }
   epub.nav.ol.content = epub.nav.oli+
   
   epub.nav.oli = element li { oli.attrs & epub.nav.oli.content }
   epub.nav.oli.content = a.elem.phrasing | ((a.elem.phrasing | span.elem), epub.nav.ol)
   
   common.elem.flow |= epub.nav
`;

export const EPUB_NAV_30_SCH = `<?xml version="1.0" encoding="UTF-8"?>
<schema xmlns="http://purl.oclc.org/dsdl/schematron"  queryBinding="xslt2">

    <ns uri="http://www.w3.org/1999/xhtml" prefix="html"/>
    <ns uri="http://www.idpf.org/2007/ops" prefix="epub"/>

    <pattern id="nav-ocurrence">
        <rule context="html:body">
            <assert test="count(.//html:nav[tokenize(@epub:type,'\\s+')='toc']) = 1">Exactly one "toc" nav element
                must be present</assert>
            <assert test="count(.//html:nav[tokenize(@epub:type,'\\s+')='page-list']) &lt; 2">Multiple occurrences of
                the "page-list" nav element</assert>
            <assert test="count(.//html:nav[tokenize(@epub:type,'\\s+')='landmarks']) &lt; 2">Multiple occurrences of
                the "landmarks" nav element</assert>
        </rule>
    </pattern>

    <pattern id="span-no-sublist">
        <rule context="html:body//html:nav[@epub:type]//html:span">
            <assert test="count(.//ol) = 0"> The span element must only be used as heading for flat
                sublists (not hierarchical navigation structures) </assert>
        </rule>
    </pattern>

    <pattern id="landmarks">
        <rule context="html:nav[tokenize(@epub:type,'\\s+')='landmarks']//html:ol//html:a">
            <let name="current" value="."/>
            <let name="current_type_normalized" value="tokenize(lower-case(@epub:type),'\\s+')"/>
            <let name="current_href_normalized" value="normalize-space(lower-case(@href))"/>

            <!-- Check for missing epub:type attributes -->
            <assert test="@epub:type">Missing epub:type attribute on anchor inside "landmarks" nav element</assert>

            <!--
                landmarks anchors should be unique (#493)
                and only reported within the same ancestor landmarks element
            -->
            <assert test="
                empty(ancestor::html:nav//html:ol//html:a[
                    not(. is $current) and
                    tokenize(lower-case(@epub:type),'\\s+') = $current_type_normalized and
                    normalize-space(lower-case(@href)) = $current_href_normalized
                    ])">Another landmark was found with the same epub:type and same reference to "<value-of select="$current_href_normalized"/>"</assert>
        </rule>
    </pattern>

    <pattern id="link-labels">
        <rule context="html:nav[@epub:type]//html:ol//html:a">
            <assert
                test="string-length(normalize-space(string-join(.|./html:img/@alt|.//@aria-label))) > 0"
                >Anchors within nav elements must contain text</assert>
        </rule>
    </pattern>

    <pattern id="span-labels">
        <rule context="html:nav[@epub:type]//html:ol//html:span">
            <assert
                test="string-length(normalize-space(string-join(.|./html:img/@alt|.//@aria-label))) > 0"
                >Spans within nav elements must contain text</assert>
        </rule>
    </pattern>

    <pattern id="req-heading">
        <rule
          context="html:nav[@epub:type][not(tokenize(@epub:type,'\\s+') = ('toc','page-list','landmarks'))]">
            <assert test="child::*[1][self::html:h1|self::html:h2|self::html:h3|self::html:h4|self::html:h5|self::html:h6]">nav
                elements other than "toc", "page-list" and "landmarks" must have a heading as their
                first child</assert>
        </rule>
    </pattern>

    <pattern id="heading-content">
        <rule context="html:h1|html:h2|html:h3|html:h4|html:h5|html:h6">
            <assert
                test="string-length(normalize-space(string-join(.|./html:img/@alt|.//@aria-label))) > 0"
                >Heading elements must contain text</assert>
        </rule>
    </pattern>
    
    <pattern id="flat-nav">
        <rule context="html:nav[tokenize(@epub:type,'\\s+') = ('page-list','landmarks')]">
            <assert test="count(.//html:ol) = 1">WARNING: A "<value-of select="@epub:type"/>" nav element should contain
                only a single ol descendant (no nested sublists)</assert>
        </rule>
    </pattern>

</schema>
`;

export const EPUB_SVG_30_RNC = `
# #####################################################################
##  RELAX NG Schema for EPUB: EPUB SVG (+ XHTML, + MathML)            #
# #####################################################################

include "./mod/epub-xhtml-svg-mathml.rnc" {
  start = svg
  
  # Override the \`id\` attribute to require a valid XML ID
  svg.attr.id = attribute id { xsd:ID }?
}

# Allow \`body\` element as a child of \`foreignObject\` 
svg.foreignObject.inner |= body.elem 

# Allow \`epub:prefix\` attribute on \`svg\` root
svg.attrs &= epub.prefix.attr.ns?
`;

export const EPUB_SVG_30_SCH = `<?xml version="1.0" encoding="UTF-8"?>
<schema xmlns="http://purl.oclc.org/dsdl/schematron">    
    
    <include href="./mod/id-unique.sch"/>
        
</schema>

`;

export const EPUB_XHTML_30_RNC = `
# #####################################################################
##  RELAX NG Schema for EPUB: EPUB XHTML (+ SVG, + MathML)            #
# #####################################################################

include "./mod/epub-xhtml-svg-mathml.rnc"`;

export const EPUB_XHTML_30_SCH = `<?xml version="1.0" encoding="UTF-8"?>
<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">

    <ns uri="http://www.w3.org/1999/xhtml" prefix="h"/>
    <ns uri="http://www.idpf.org/2007/ops" prefix="epub"/>
    <ns uri="http://www.w3.org/1998/Math/MathML" prefix="math"/>
    <ns uri="http://www.w3.org/2001/10/synthesis" prefix="ssml"/>
    <ns uri="http://www.w3.org/2001/xml-events" prefix="ev"/>
    <ns uri="http://www.w3.org/2000/svg" prefix="svg"/>

    <let name="id-set" value="//*[@id]"/>

    <pattern id="encoding.decl.state">
        <rule context="h:meta[lower-case(@http-equiv)='content-type']">
            <assert test="matches(normalize-space(@content),'text/html;\\s*charset=utf-8','i')">The
                meta element in encoding declaration state (http-equiv='content-type') must have the
                value "text/html; charset=utf-8"</assert>
            <assert test="empty(../h:meta[@charset])">A document must not contain both a meta element
                in encoding declaration state (http-equiv='content-type') and a meta element with
                the charset attribute present.</assert>
        </rule>
    </pattern>
  
    <pattern id="title.present">
      <rule context="h:head">
        <assert test="exists(h:title)"
          >WARNING: The "head" element should have a "title" child element.</assert>
      </rule>
    </pattern>
    
    <pattern id="title.non-empty">
        <rule context="h:title">
            <assert test="normalize-space(.)"
                >Element "title" must not be empty.</assert>
        </rule>
    </pattern>
    
    <pattern id="epub.switch.deprecated">
        <rule context="epub:switch">
            <report test="true()"
                >WARNING: The "epub:switch" element is deprecated.</report>
        </rule>
    </pattern>
    
    <pattern id="epub.trigger.deprecated">
        <rule context="epub:trigger">
            <report test="true()"
                >WARNING: The "epub:trigger" element is deprecated.</report>
        </rule>
    </pattern>

    <pattern id="ancestor-area-map" is-a="required-ancestor">
        <param name="descendant" value="h:area"/>
        <param name="ancestor" value="h:map"/>
    </pattern>

    <pattern id="ancestor-imgismap-ahref" is-a="required-ancestor">
        <param name="descendant" value="h:img[@ismap]"/>
        <param name="ancestor" value="h:a[@href]"/>
    </pattern>
    
    <pattern id="descendant-a-interactive" is-a="no-interactive-content-descendants">
        <param name="ancestor" value="h:a"/>
    </pattern>

    <pattern id="descendant-button-interactive" is-a="no-interactive-content-descendants">
        <param name="ancestor" value="h:button"/>
    </pattern>

    <pattern id="descendant-audio-audio" is-a="disallowed-descendants">
        <param name="ancestor" value="h:audio"/>
        <param name="descendant" value="h:audio"/>
    </pattern>

    <pattern id="descendant-audio-video" is-a="disallowed-descendants">
        <param name="ancestor" value="h:audio"/>
        <param name="descendant" value="h:video"/>
    </pattern>

    <pattern id="descendant-video-video" is-a="disallowed-descendants">
        <param name="ancestor" value="h:video"/>
        <param name="descendant" value="h:video"/>
    </pattern>

    <pattern id="descendant-video-audio" is-a="disallowed-descendants">
        <param name="ancestor" value="h:video"/>
        <param name="descendant" value="h:audio"/>
    </pattern>

    <pattern id="descendant-address-address" is-a="disallowed-descendants">
        <param name="ancestor" value="h:address"/>
        <param name="descendant" value="h:address"/>
    </pattern>

    <pattern id="descendant-address-header" is-a="disallowed-descendants">
        <param name="ancestor" value="h:address"/>
        <param name="descendant" value="h:header"/>
    </pattern>

    <pattern id="descendant-address-footer" is-a="disallowed-descendants">
        <param name="ancestor" value="h:address"/>
        <param name="descendant" value="h:footer"/>
    </pattern>

    <pattern id="descendant-form-form" is-a="disallowed-descendants">
        <param name="ancestor" value="h:form"/>
        <param name="descendant" value="h:form"/>
    </pattern>

    <pattern id="descendant-progress-progress" is-a="disallowed-descendants">
        <param name="ancestor" value="h:progress"/>
        <param name="descendant" value="h:progress"/>
    </pattern>

    <pattern id="descendant-meter-meter" is-a="disallowed-descendants">
        <param name="ancestor" value="h:meter"/>
        <param name="descendant" value="h:meter"/>
    </pattern>

    <pattern id="descendant-dfn-dfn" is-a="disallowed-descendants">
        <param name="ancestor" value="h:dfn"/>
        <param name="descendant" value="h:dfn"/>
    </pattern>

    <pattern id="descendant-caption-table" is-a="disallowed-descendants">
        <param name="ancestor" value="h:caption"/>
        <param name="descendant" value="h:table"/>
    </pattern>

    <pattern id="descendant-header-header" is-a="disallowed-descendants">
        <param name="ancestor" value="h:header"/>
        <param name="descendant" value="h:header"/>
    </pattern>

    <pattern id="descendant-header-footer" is-a="disallowed-descendants">
        <param name="ancestor" value="h:header"/>
        <param name="descendant" value="h:footer"/>
    </pattern>

    <pattern id="descendant-footer-footer" is-a="disallowed-descendants">
        <param name="ancestor" value="h:footer"/>
        <param name="descendant" value="h:footer"/>
    </pattern>

    <pattern id="descendant-footer-header" is-a="disallowed-descendants">
        <param name="ancestor" value="h:footer"/>
        <param name="descendant" value="h:header"/>
    </pattern>

    <pattern id="descendant-label-label" is-a="disallowed-descendants">
        <param name="ancestor" value="h:label"/>
        <param name="descendant" value="h:label"/>
    </pattern>

    <pattern id="bdo-dir" is-a="required-attr">
        <param name="elem" value="h:bdo"/>
        <param name="attr" value="dir"/>
    </pattern>

    <pattern id="idrefs-aria-describedby" is-a="idrefs-any">
        <param name="element" value="*"/>
        <param name="idrefs-attr-name" value="aria-describedby"/>
    </pattern>

    <pattern id="idrefs-output-for" is-a="idrefs-any">
        <param name="element" value="h:output"/>
        <param name="idrefs-attr-name" value="for"/>
    </pattern>

    <pattern id="idrefs-aria-flowto" is-a="idrefs-any">
        <param name="element" value="*"/>
        <param name="idrefs-attr-name" value="aria-flowto"/>
    </pattern>

    <pattern id="idrefs-aria-labelledby" is-a="idrefs-any">
        <param name="element" value="*"/>
        <param name="idrefs-attr-name" value="aria-labelledby"/>
    </pattern>

    <pattern id="idrefs-aria-owns" is-a="idrefs-any">
        <param name="element" value="*"/>
        <param name="idrefs-attr-name" value="aria-owns"/>
    </pattern>

    <pattern id="idrefs-aria-controls" is-a="idrefs-any">
        <param name="element" value="*"/>
        <param name="idrefs-attr-name" value="aria-controls"/>
    </pattern>

    <pattern id="idref-mathml-xref" is-a="idref-any">
        <param name="element" value="math:*"/>
        <param name="idref-attr-name" value="xref"/>
    </pattern>

    <pattern id="idref-mathml-indenttarget" is-a="idref-any">
        <param name="element" value="math:*"/>
        <param name="idref-attr-name" value="indenttarget"/>
    </pattern>

    <pattern id="idref-input-list" is-a="idref-named">
        <param name="element" value="h:input"/>
        <param name="idref-attr-name" value="list"/>
        <param name="target-name" value="h:datalist"/>
    </pattern>

    <pattern id="idref-forms-form" is-a="idref-named">
        <param name="element" value="h:*"/>
        <param name="idref-attr-name" value="form"/>
        <param name="target-name" value="h:form"/>
    </pattern>

    <pattern id="idref-aria-activedescendant">
        <rule context="*[@aria-activedescendant]">
            <assert test="descendant::*[@id = current()/@aria-activedescendant]">The
                aria-activedescendant attribute must refer to a descendant element.</assert>
        </rule>
    </pattern>

    <pattern id="idref-label-for">
        <rule context="h:label[@for]">
            <assert
                test="some $elem in $id-set satisfies $elem/@id eq current()/@for and 
                   (local-name($elem) eq 'button' 
                 or (local-name($elem) eq 'input' and not($elem/@type='hidden'))
                 or local-name($elem) eq 'meter'
                 or local-name($elem) eq 'output' 
                 or local-name($elem) eq 'progress' 
                 or local-name($elem) eq 'select' 
                 or local-name($elem) eq 'textarea')"
                >The for attribute does not refer to an allowed target element (expecting:
                button|meter|output|progress|select|textarea|input[not(@type='hidden')]).</assert>
        </rule>
    </pattern>

    <pattern id="idrefs-headers">
        <rule context="h:*[@headers]">
            <let name="table" value="ancestor::h:table"/>
            <assert
                test="every $idref in tokenize(normalize-space(@headers), '\\s+') satisfies (some $elem in $table//h:th satisfies ($elem/@id eq $idref))"
                >The headers attribute must refer to th elements in the same table.</assert>
        </rule>
    </pattern>

    <pattern id="idref-trigger-observer" is-a="idref-any">
        <param name="element" value="epub:trigger"/>
        <param name="idref-attr-name" value="ev:observer"/>
    </pattern>

    <pattern id="idref-trigger-ref" is-a="idref-any">
        <param name="element" value="epub:trigger"/>
        <param name="idref-attr-name" value="ref"/>
    </pattern>

    <pattern id="map.name">
        <rule context="h:map[@name]">
            <let name="name-set" value="//h:map[@name]"/>
            <assert test="count($name-set[@name = current()/@name]) = 1">Duplicate map name
                    "<value-of select="current()/@name"/>"</assert>
        </rule>
    </pattern>

    <pattern id="map.id">
        <rule context="h:map[@id and @name]">
            <assert test="@id = @name">The id attribute on the map element must have the same value
                as the name attribute.</assert>
        </rule>
    </pattern>

    <pattern id="lang-xmllang">
        <rule context="h:*[@lang and @xml:lang]">
            <assert test="lower-case(@xml:lang) = lower-case(@lang)">The lang and xml:lang
                attributes must have the same value.</assert>
        </rule>
    </pattern>

    <pattern id="id-unique">
        <rule context="*[@id]">
            <assert test="count($id-set[@id = current()/@id]) = 1">Duplicate ID "<value-of
                    select="current()/@id"/>"</assert>
        </rule>
    </pattern>

    <pattern id="select-multiple">
        <rule context="h:select[not(@multiple)]">
            <report test="count(descendant::h:option[@selected]) > 1">A select element whose
                multiple attribute is not specified must not have more than one descendant option
                element with its selected attribute set.</report>
        </rule>
    </pattern>

    <pattern id="track">
        <rule context="h:track">
            <report test="@label and normalize-space(@label) = ''">The track element label attribute
                value must not be the empty string.</report>
            <report test="@default and preceding-sibling::h:track[@default]">There must not be more
                than one track child of a media element element with the default attribute
                specified.</report>
        </rule>
    </pattern>

    <pattern id="ssml-ph">
        <rule context="*[@ssml:ph]">
            <report test="ancestor::*[@ssml:ph]">The ssml:ph attribute must not be specified on a
                descendant of an element that also carries this attribute.</report>
        </rule>
    </pattern>

    <pattern id="link-sizes">
        <rule context="h:link[@sizes]">
            <assert test="@rel='icon'">The sizes attribute must not be specified on link elements
                that do not have a rel attribute that specifies the icon keyword.</assert>
        </rule>
    </pattern>

    <pattern id="meta-charset">
        <rule context="h:meta[@charset]">
            <assert test="count(preceding-sibling::h:meta[@charset]) = 0">There must not be more
                than one meta element with a charset attribute per document.</assert>
        </rule>
    </pattern>

    <pattern id="md-a-area">
        <rule context="h:a[@itemprop] | h:area[@itemprop]">
            <assert test="@href">If the itemprop is specified on an a element, then the href
                attribute must also be specified.</assert>
        </rule>
    </pattern>

    <pattern id="md-iframe-embed-object">
        <rule context="h:iframe[@itemprop] | h:embed[@itemprop] | h:object[@itemprop]">
            <assert test="@data">If the itemprop is specified on an iframe, embed or object element,
                then the data attribute must also be specified.</assert>
        </rule>
    </pattern>

    <pattern id="md-media">
        <rule context="h:audio[@itemprop] | h:video[@itemprop]">
            <assert test="@src">If the itemprop is specified on an video or audio element, then the
                src attribute must also be specified.</assert>
        </rule>
    </pattern>

    <pattern abstract="true" id="idref-any">
        <rule context="$element[@$idref-attr-name]">
            <assert test="some $elem in $id-set satisfies $elem/@id eq current()/@$idref-attr-name"
                >The <name path="@$idref-attr-name"/> attribute must refer to an element in the same
                document (the ID "<value-of select="current()/@$idref-attr-name"/>" does not
                exist).</assert>
        </rule>
    </pattern>

    <pattern abstract="true" id="idrefs-any">
        <rule context="$element[@$idrefs-attr-name]">
            <assert
                test="every $idref in tokenize(normalize-space(@$idrefs-attr-name),'\\s+') satisfies (some $elem in $id-set satisfies ($elem/@id eq $idref))"
                >The <name path="@$idrefs-attr-name"/> attribute must refer to elements in the same
                document (target ID missing)</assert>
        </rule>
    </pattern>

    <pattern abstract="true" id="idref-named">
        <rule context="$element[@$idref-attr-name]">
            <assert test="//$target-name[@id = current()/@$idref-attr-name]">The <name
                    path="@$idref-attr-name"/> attribute does not refer to an allowed target element
                (expecting: <value-of select="replace('$target-name','h:','')"/>).</assert>
        </rule>
    </pattern>

    <pattern abstract="true" id="required-attr">
        <rule context="$elem">
            <assert test="@$attr">The <name/> element must have a <value-of select="'$attr'"/>
                attribute.</assert>
        </rule>
    </pattern>

    <pattern abstract="true" id="disallowed-descendants">
        <rule context="$descendant">
            <report test="ancestor::$ancestor">The <name/> element must not appear inside <value-of
                    select="local-name(ancestor::$ancestor)"/> elements.</report>
        </rule>
    </pattern>

    <pattern abstract="true" id="required-ancestor">
        <rule context="$descendant">
            <assert test="ancestor::$ancestor">The <value-of select="replace('$descendant','h:','')"
                /> element must have an ancestor <value-of select="replace('$ancestor','h:','')"/>
                element.</assert>
        </rule>
    </pattern>

    <pattern abstract="true" id="no-interactive-content-descendants">
        <rule
            context="h:a|h:audio[@controls]|h:button|h:details|h:embed|h:iframe|h:img[@usemap]|h:input[not(@type='hidden')]
            |h:label|h:menu|h:object[@usemap]|h:select|h:textarea|h:video[@controls]">
            <report test="ancestor::$ancestor">The <name/> element must not appear inside <value-of
                    select="local-name(ancestor::$ancestor)"/> elements.</report>
        </rule>
    </pattern>
    
    <pattern id="dpub-aria.doc-endnote.deprecated">
        <rule context="h:*[@role]">
            <report test="tokenize(@role,'\\s+')='doc-endnote'"
                >WARNING: The "doc-endnote" role is deprecated and should not be used.</report>
            <report test="tokenize(@role,'\\s+')='doc-biblioentry'"
                >WARNING: The "doc-biblioentry" role is deprecated and should not be used.</report>
        </rule>
    </pattern>

</schema>
`;

export const NCX_RNG = `<?xml version="1.0"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0"
         ns="http://www.daisy.org/z3986/2005/ncx/"
         datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes">
         
	<!--
    Revision history:    
    	20080107: mgylling: defined i18n attr group, referenced this from 
    		elements ncx, docTitle, docAuthor, navLabel, navInfo
    	20080523: mgylling: navList @class and @id made individually optional
    	20131030: tfischer: change all @id attributes to correct <data type="ID"/> instead of <text/>
    
    --> 
         
	<start>
		<element name="ncx">
			<attribute name="version">
				<value>2005-1</value>
			</attribute>
			<ref name="i18n"/>
			<element name="head">
				<oneOrMore>
					<ref name="meta"/>
				</oneOrMore>
			</element>
			<element name="docTitle">
				<optional>
					<attribute name="id">
						<!-- checks lexical constraints only -->
						<!-- uniqueness check is done in saxhandler, as the NCX schematron impl uses 1.5, which does not have value-of in reports -->
						<data type="ID"/>
					</attribute>
				</optional>
				<ref name="text"/>
				<optional>
					<ref name="img"/>
				</optional>
				<ref name="i18n"/>
			</element>
			<zeroOrMore>
				<element name="docAuthor">
					<optional>
						<attribute name="id">
							<data type="ID"/>
						</attribute>
					</optional>
					<ref name="text"/>
					<optional>
						<ref name="img"/>
					</optional>
					<ref name="i18n"/>
				</element>
			</zeroOrMore>
			<element name="navMap">
				<optional>
					<attribute name="id">
						<data type="ID"/>
					</attribute>
				</optional>
				<zeroOrMore>
					<ref name="navInfo"/>
				</zeroOrMore>
				<zeroOrMore>
					<ref name="navLabel"/>
				</zeroOrMore>
      			<oneOrMore>
					<ref name="navPoint"/>
      			</oneOrMore>
      		</element>
			<optional>
				<ref name="pageList"/>
			</optional>
			<zeroOrMore>
				<ref name="navList"/>
			</zeroOrMore>
    		</element>
   	</start>

	<define name="text">
		<element name="text">
			<optional>
				<attribute name="id">
					<data type="ID"/>
				</attribute>
				<attribute name="class">
					<text/>
				</attribute>
			</optional>
			<text/>
		</element>
	</define>

	<define name="img">
		<element name="img">
			<optional>
				<attribute name="id">
					<data type="ID"/>
				</attribute>
				<attribute name="class">
					<text/>
				</attribute>
			</optional>
			<attribute name="src">
				<text/>
			</attribute>
		</element>
	</define>

	<define name="content">
		<element name="content">
			<optional>
				<attribute name="id">
					<data type="ID"/>
				</attribute>
			</optional>
			<attribute name="src">
				<text/>
			</attribute>
		</element>
	</define>

	<define name="navInfo">
		<element name="navInfo">
			<ref name="text"/>
			<optional>
				<ref name="img"/>
			</optional>
			<ref name="i18n"/>
		</element>
	</define>

	<define name="navLabel">
		<element name="navLabel">
			<ref name="text"/>
			<optional>
				<ref name="img"/>
			</optional>
			<ref name="i18n"/>
		</element>
	</define>

   	<define name="navPoint">
		<element name="navPoint">
			<attribute name="id">
				<data type="ID"/>
			</attribute>
			<optional>
				<attribute name="class">
					<text/>
				</attribute>
			</optional>
			<optional>
				<attribute name="playOrder">
					<text/>
				</attribute>
			</optional>	
			<oneOrMore>
				<ref name="navLabel"/>
			</oneOrMore>
			<ref name="content"/>
			<zeroOrMore>
				<ref name="navPoint"/>
			</zeroOrMore>
		</element>
   	</define>

	<define name="pageList">
		<element name="pageList">
			<optional>
				<attribute name="id">
					<data type="ID"/>
				</attribute>
				<attribute name="class">
					<text/>
				</attribute>
			</optional>
			<optional>
				<ref name="navLabel"/>
			</optional>
			<optional>
				<ref name="navInfo"/>
			</optional>
			<oneOrMore>
				<ref name="pageTarget"/>
			</oneOrMore>
		</element>
	</define>

	<define name="navList">
		<element name="navList">
			<optional>
				<attribute name="id">
					<data type="ID"/>
				</attribute>
			</optional>
			<optional>
				<attribute name="class">
					<text/>
				</attribute>
			</optional>
			<zeroOrMore>
				<ref name="navInfo"/>
			</zeroOrMore>
			<oneOrMore>
				<ref name="navLabel"/>				
			</oneOrMore>
			<oneOrMore>
				<ref name="navTarget"/>
			</oneOrMore>
		</element>
	</define>

	<define name="pageTarget">
		<element name="pageTarget">
			<optional>
				<attribute name="id">
					<data type="ID"/>
				</attribute>
			</optional>
			<optional>			
				<attribute name="value">
					<text/>
				</attribute>
			</optional>
			<attribute name="type">
				<choice>
					<value>front</value>
					<value>normal</value>
					<value>special</value>
				</choice>
			</attribute>
			<optional>
				<attribute name="class">
					<text/>
				</attribute>
			</optional>
			<optional>
				<attribute name="playOrder">
					<text/>
				</attribute>
			</optional>
			<oneOrMore>
				<ref name="navLabel"/>
			</oneOrMore>
			<ref name="content"/>
		</element>
	</define>

	<define name="navTarget">
		<element name="navTarget">
			<attribute name="id">
				<data type="ID"/>
			</attribute>
			<optional>
				<attribute name="class">
					<text/>
				</attribute>
			</optional>			
			<optional>
				<attribute name="value">
					<text/>
				</attribute>
			</optional>
			<optional>
				<attribute name="playOrder">
					<text/>
				</attribute>
			</optional>	
			<oneOrMore>
				<ref name="navLabel"/>
			</oneOrMore>
			<ref name="content"/>
		</element>
	</define>

   	<define name="meta">
		<element name="meta">
			<attribute name="name">
				<text/>
			</attribute>
			<attribute name="content">
				<text/>
			</attribute>
			<optional>
				<attribute name="scheme">
					<text/>
				</attribute>
			</optional>
		</element>
	</define>
	
	<define name="i18n">
		<optional>
        	<attribute name="lang" ns="http://www.w3.org/XML/1998/namespace">
      			<data type="language"/>
			</attribute>
		</optional>
     	<optional>
       		<attribute name="dir">
         		<choice>
           			<value>ltr</value>
           			<value>rtl</value>
         		</choice>
       		</attribute>
     	</optional>
    </define>
    
</grammar>`;

export const OCF_CONTAINER_30_RNC = `   default namespace = "urn:oasis:names:tc:opendocument:xmlns:container"
   include "./mod/datatypes.rnc"
   include "./multiple-renditions/container.rnc"

   start = ocf.container 
      
   ocf.container = 
      element container { ocf.container.attlist & ocf.container.content }
   ocf.container.attlist =
      attribute version { '1.0' }
   ocf.container.content = ocf.rootfiles, ocf.links?

   ocf.rootfiles = 
      element rootfiles { ocf.rootfiles.attlist & ocf.rootfiles.content  }
   ocf.rootfiles.attlist = empty
   ocf.rootfiles.content = ocf.rootfile+

   ocf.rootfile  =
      element rootfile {ocf.rootfile.attlist & ocf.rootfile.content  }
   ocf.rootfile.attlist = 
      attribute full-path { datatype.URI } &
      attribute media-type { 'application/oebps-package+xml' }
   ocf.rootfile.content = empty

   ocf.links = 
      element links { ocf.links.attlist & ocf.links.content  }
   ocf.links.attlist = empty
   ocf.links.content = ocf.link+
   
   ocf.link = 
      element link { ocf.link.attlist & ocf.link.content  }
   ocf.link.attlist = 
        attribute href { datatype.URI } &
        attribute rel { datatype.space.separated.tokens } &
        attribute media-type { datatype.mimetype }?
   ocf.link.content = empty

`;

export const OPF_RNG = `<?xml version="1.0"?>
<grammar xmlns="http://relaxng.org/ns/structure/1.0"
         datatypeLibrary="http://www.w3.org/2001/XMLSchema-datatypes">
         
<include href="opf20.rng"/>
<include href="opf12.rng"/>

<start>
  <choice>
    <ref name="OPF20.package-element"/>
    <ref name="OPF12.package-element"/>
  </choice>
</start>
	
</grammar>`;

export const PACKAGE_30_RNC = `
      
   default namespace = "http://www.idpf.org/2007/opf"
   namespace opf = "http://www.idpf.org/2007/opf"
   namespace dc = "http://purl.org/dc/elements/1.1/"
   
   include "./mod/datatypes.rnc"
   include "./mod/epub-prefix-attr.rnc"
   
      
   start = element package { opf.package.attlist & opf.package.content }
   
   opf.package.attlist &= opf.version.attr & opf.unique.identifier.attr & opf.id.attr? & epub.prefix.attr? & opf.i18n.attrs            
   opf.version.attr = attribute version { '3.0' }
   opf.unique.identifier.attr = attribute unique-identifier { datatype.IDREF }
   
   opf.package.content = opf.metadata, opf.manifest, opf.spine, opf.guide?, opf.bindings?, opf.collection*

   opf.metadata = element metadata { opf.id.attr? & opf.i18n.attrs & opf.metadata.content }
   opf.metadata.content = opf.dc.elems & opf.meta* & opf.link* 
   
   opf.meta = element meta { 
      opf.epub3.meta.content | opf.epub2.meta.content
   }
   
   opf.epub3.meta.content = (opf.property.attr & opf.refines.attr? & opf.id.attr? & opf.scheme.attr? & opf.i18n.attrs & datatype.string.nonempty)
   opf.epub2.meta.content = (attribute name { text } & attribute content { text })  #legacy
   
   opf.link = element link { opf.href.attr & opf.hreflang.attr? & opf.rel.attr & opf.id.attr? & opf.refines.attr? & opf.media-type.attr? & opf.properties.attr? }         
      
   opf.property.attr = attribute property { datatype.property }
   opf.rel.attr = attribute rel { datatype.properties }
   opf.hreflang.attr = attribute hreflang { "" | datatype.languagecode }
   opf.scheme.attr = attribute scheme { datatype.property }
   opf.refines.attr = attribute refines { datatype.URI }
   
   opf.dc.identifier = element dc:identifier { opf.id.attr? & datatype.string.nonempty } 
   opf.dc.title = element dc:title { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.language = element dc:language { opf.id.attr? & datatype.string.nonempty }
   opf.dc.date = element dc:date { opf.id.attr? & datatype.string.nonempty }
   opf.dc.source = element dc:source { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.type = element dc:type { opf.id.attr? & datatype.string.nonempty }
   opf.dc.format = element dc:format { opf.id.attr? & datatype.string.nonempty }
   opf.dc.creator = element dc:creator { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.subject = element dc:subject { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.description = element dc:description { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.publisher = element dc:publisher { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.contributor = element dc:contributor { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.relation = element dc:relation { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.coverage = element dc:coverage { opf.dc.attlist & datatype.string.nonempty }
   opf.dc.rights = element dc:rights { opf.dc.attlist & datatype.string.nonempty }
   
   opf.dc.elems = opf.dc.identifier+
                & opf.dc.title+
                & opf.dc.language+
                & opf.dc.date?
                & opf.dc.source*
                & opf.dc.type*
                & opf.dc.format*
                & opf.dc.creator*
                & opf.dc.subject*
                & opf.dc.description*
                & opf.dc.publisher*
                & opf.dc.contributor*
                & opf.dc.relation*
                & opf.dc.coverage*
                & opf.dc.rights*

   opf.dc.attlist = opf.id.attr? & opf.i18n.attrs
      
   opf.manifest = element manifest { opf.manifest.attlist & opf.manifest.content }
   opf.manifest.attlist &= opf.id.attr?
   opf.manifest.content = opf.item+
   
   
   opf.item = element item { opf.item.attlist }
   opf.item.attlist &= opf.id.attr & opf.href.attr & opf.media-type.attr & opf.fallback.attr? & opf.media-overlay.attr? & opf.properties.attr?  
   
   opf.fallback.attr = attribute fallback { datatype.IDREF }
   opf.media-overlay.attr = attribute media-overlay { datatype.IDREF }   
   opf.properties.attr = attribute properties { datatype.properties }
   
   
   opf.spine = element spine { opf.spine.attlist & opf.spine.content }
   opf.spine.attlist &= opf.id.attr? & opf.spine.toc.attr? & opf.ppd.attr?
   opf.spine.toc.attr = attribute toc { datatype.IDREF }
   opf.ppd.attr = attribute page-progression-direction { 'ltr' | 'rtl' | 'default'}
   opf.spine.content = opf.itemref+
   
   
   opf.itemref = element itemref { opf.itemref.attlist }
   opf.itemref.attlist &= opf.itemref.idref.attr & opf.itemref.linear.attr? & opf.id.attr? & opf.properties.attr?
   opf.itemref.idref.attr = attribute idref { datatype.IDREF }
   opf.itemref.linear.attr = attribute linear { 'yes' | 'no' }
   
    
   opf.guide = element guide { opf.reference+ }
   opf.reference = element reference { opf.href.attr & attribute type { datatype.text } & attribute title { datatype.text }?}
   
   opf.bindings = element bindings { opf.bindings.mediaType+ }
   opf.bindings.mediaType = element mediaType { opf.bindings.mediaType.attlist }
   opf.bindings.mediaType.attlist &= opf.media-type.attr & attribute handler { datatype.IDREF }
   
   opf.collection = element collection { opf.collection.attlist, opf.collection.content }
   opf.collection.attlist &= opf.id.attr? & opf.dir.attr? & opf.xml.lang.attr? & opf.collection.role.attr
   opf.collection.role.attr = attribute role { datatype.space.separated.tokens }
   opf.collection.content = opf.collection.metadata?, (opf.collection+ | (opf.collection*, opf.collection.link+))
   opf.collection.metadata = element metadata { opf.id.attr? & opf.i18n.attrs & opf.collection.metadata.content }
   opf.collection.metadata.content = opf.collection.dc.elems & opf.collection.meta* & opf.link*
   opf.collection.dc.elems = opf.dc.identifier*
                           & opf.dc.title*
                           & opf.dc.language*
                           & opf.dc.date*
                           & opf.dc.source*
                           & opf.dc.type* 
                           & opf.dc.format* 
                           & opf.dc.creator*
                           & opf.dc.subject*
                           & opf.dc.description*
                           & opf.dc.publisher*
                           & opf.dc.contributor*
                           & opf.dc.relation*
                           & opf.dc.coverage*
                           & opf.dc.rights*
   opf.collection.meta = element meta { opf.epub3.meta.content }
   opf.collection.link = element link { opf.href.attr & opf.rel.attr? & opf.id.attr? & opf.media-type.attr? }
   
   opf.media-type.attr = attribute media-type { datatype.mimetype }
   opf.href.attr = attribute href { datatype.URI }
   opf.id.attr = attribute id { datatype.ID }
   opf.i18n.attrs = opf.xml.lang.attr? & opf.dir.attr?
   opf.xml.lang.attr = attribute xml:lang { "" | datatype.languagecode }
   opf.dir.attr = attribute dir { 'ltr' | 'rtl' | 'auto' }
`;

export const PACKAGE_30_SCH = `<?xml version="1.0" encoding="UTF-8"?>
<schema xmlns="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">

    <ns uri="http://www.idpf.org/2007/opf" prefix="opf"/>
    <ns uri="http://purl.org/dc/elements/1.1/" prefix="dc"/>
    
    <!-- Unique ID checks -->

    <pattern id="opf.uid">
        <rule context="opf:package[@unique-identifier]">
            <let name="uid" value="./normalize-space(@unique-identifier)"/>
            <assert test="/opf:package/opf:metadata/dc:identifier[normalize-space(@id) = $uid]">package element
                unique-identifier attribute does not resolve to a dc:identifier element (given
                reference was "<value-of select="$uid"/>")</assert>
        </rule>
    </pattern>

    <pattern id="opf.dcterms.modified">
        <rule context="opf:package/opf:metadata">
            <assert test="count(opf:meta[normalize-space(@property)='dcterms:modified' and not(@refines)]) = 1"
                >package dcterms:modified meta element must occur exactly once</assert>
        </rule>
    </pattern>

    <pattern id="opf.dcterms.modified.syntax">
        <rule context="opf:meta[normalize-space(@property)='dcterms:modified'][not(ancestor::opf:collection)]">
            <assert
                test="matches(normalize-space(.), '^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})Z$')"
                >dcterms:modified illegal syntax (expecting: "CCYY-MM-DDThh:mm:ssZ")</assert>
        </rule>
    </pattern>
    
    <!-- Link checks -->
    
    <pattern id="opf.link.record">
        <rule context="opf:link[tokenize(@rel,'\\s+')='record']">
            <!--<assert test="exists(@media-type)">**checked in java**</assert>-->
            <assert test="empty(@refines)">"record" links only applies to the Publication (must not
                have a "refines" attribute).</assert>
        </rule>
    </pattern>
    
    <pattern id="opf.link.voicing">
        <rule context="opf:link[tokenize(@rel,'\\s+')='voicing']">
            <!--<assert test="starts-with(normalize-space(@media-type),'audio/')">**checked in java**</assert>-->
            <assert test="exists(@refines)">"voicing" links must have a "refines" attribute.</assert>
        </rule>
    </pattern>
    
    <!-- Metadata checks -->

    <pattern id="opf.refines.relative">
        <rule context="*[not(ancestor::opf:collection)][@refines]">
            <report test="matches(@refines,'[a-zA-Z]([a-zA-Z0-9]|\\+|\\-|\\.)*:')">@refines must be a relative URL</report>
        </rule>
    </pattern>
    <pattern id="opf.refines.by-fragment">
        <rule context="*[not(ancestor::opf:collection)][@refines]">
            <let name="refines-url" value="resolve-uri(@refines)"/>
            <let name="item" value="//opf:manifest/opf:item[resolve-uri(normalize-space(@href))=$refines-url]"/>
            <report test="$item">WARNING: @refines should instead refer to "<value-of
                select="@refines"/>" using a fragment identifier pointing to its manifest item ("#<value-of
                    select="$item/@id"/>")
            </report>
        </rule>
    </pattern>
    <pattern id="opf.refines.fragment-exists">
        <rule context="*[not(ancestor::opf:collection)][@refines and starts-with(normalize-space(@refines),'#')]">
        	<let name="refines-target-id" value="substring(normalize-space(@refines), 2)"/>
            <assert test="//*[normalize-space(@id)=$refines-target-id]">@refines missing target id: "<value-of
                    select="$refines-target-id"/>"</assert>
        </rule>
    </pattern>
    
    <pattern id="opf.dc.subject.authority-term">
        <rule context="opf:metadata/dc:subject">
            <let name="id" value="normalize-space(./@id)"/>
            <let name="authority" value="//opf:meta[normalize-space(@property)='authority'][substring(normalize-space(@refines), 2) = $id]"/>
            <let name="term" value="//opf:meta[normalize-space(@property)='term'][substring(normalize-space(@refines), 2) = $id]"/>
            <report test="(count($authority) = 1 and count($term) = 0)">A term property must be associated with a dc:subject when an authority is specified</report>
            <report test="(count($authority) = 0 and count($term) = 1)">An authority property must be associated with a dc:subject when a term is specified</report>
            <report test="(count($authority) &gt; 1 or count($term) &gt; 1)">Only one pair of authority and term properties can be associated with a dc:subject</report>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.authority">
        <rule context="opf:meta[normalize-space(@property)='authority']">
            <assert test="exists(../dc:subject[concat('#',normalize-space(@id)) = normalize-space(current()/@refines)])"
                >Property "authority" must refine a "subject" property.</assert>
            <!-- Cardinality is checked in opf.dc.subject.authority-term -->
        </rule>
    </pattern>

    <pattern id="opf.meta.belongs-to-collection">
    	<rule context="opf:meta[normalize-space(@property)='belongs-to-collection']">
            <assert
            	test="empty(@refines) or exists(../opf:meta[normalize-space(@id)=substring(normalize-space(current()/@refines),2)][normalize-space(@property)='belongs-to-collection'])"
                >Property "belongs-to-collection" can only refine other "belongs-to-collection"
                properties.</assert>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.collection-type">
        <rule context="opf:meta[normalize-space(@property)='collection-type']">
            <assert
            	test="exists(../opf:meta[normalize-space(@id)=substring(normalize-space(current()/@refines),2)][normalize-space(@property)='belongs-to-collection'])"
                >Property "collection-type" must refine a "belongs-to-collection" property.</assert>
            <report test="exists(preceding-sibling::opf:meta[normalize-space(@property) = normalize-space(current()/@property)][normalize-space(@refines) = normalize-space(current()/@refines)])"
                >Property "collection-type" cannot be declared more than once to refine the same "belongs-to-collection" expression.</report>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.display-seq">
        <rule context="opf:meta[normalize-space(@property)='display-seq']">
            <report test="exists(preceding-sibling::opf:meta[normalize-space(@property) = normalize-space(current()/@property)][normalize-space(@refines) = normalize-space(current()/@refines)])"
                >Property "display-seq" cannot be declared more than once to refine the same expression.</report>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.file-as">
        <rule context="opf:meta[normalize-space(@property)='file-as']">
            <report test="exists(preceding-sibling::opf:meta[normalize-space(@property) = normalize-space(current()/@property)][normalize-space(@refines) = normalize-space(current()/@refines)])"
                >Property "file-as" cannot be declared more than once to refine the same expression.</report>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.group-position">
        <rule context="opf:meta[normalize-space(@property)='group-position']">
            <report test="exists(preceding-sibling::opf:meta[normalize-space(@property) = normalize-space(current()/@property)][normalize-space(@refines) = normalize-space(current()/@refines)])"
                >Property "group-position" cannot be declared more than once to refine the same expression.</report>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.identifier-type">
        <rule context="opf:meta[normalize-space(@property)='identifier-type']">
            <assert test="exists(../(dc:identifier|dc:source)[concat('#',normalize-space(@id)) = normalize-space(current()/@refines)])"
                >Property "identifier-type" must refine an "identifier" or "source" property.</assert>
            <report test="exists(preceding-sibling::opf:meta[normalize-space(@property) = normalize-space(current()/@property)][normalize-space(@refines) = normalize-space(current()/@refines)])"
                >Property "identifier-type" cannot be declared more than once to refine the same expression.</report>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.role">
        <rule context="opf:meta[normalize-space(@property)='role']">
            <assert test="exists(../(dc:creator|dc:contributor|dc:publisher)[concat('#',normalize-space(@id)) = normalize-space(current()/@refines)])"
                >Property "role" must refine a "creator", "contributor", or "publisher" property.</assert>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.source-of">
        <rule context="opf:meta[normalize-space(@property)='source-of']">
            <assert test="normalize-space(.) eq 'pagination'">The "source-of" property must have the
                value "pagination"</assert>
            <assert
                test="exists(@refines) and exists(../dc:source[normalize-space(@id)=substring(normalize-space(current()/@refines),2)])"
                >The "source-of" property must refine a "source" property.</assert>
            <report test="exists(preceding-sibling::opf:meta[normalize-space(@property) = normalize-space(current()/@property)][normalize-space(@refines) = normalize-space(current()/@refines)])"
                >Property "source-of" cannot be declared more than once to refine the same "source" expression.</report>
        </rule>
    </pattern>
    
    <pattern id="opf.meta.term">
        <rule context="opf:meta[normalize-space(@property)='term']">
            <assert test="exists(../dc:subject[concat('#',normalize-space(@id)) = normalize-space(current()/@refines)])"
                >Property "term" must refine a "subject" property.</assert>
            <!-- Cardinality is checked in opf.dc.subject.authority-term -->
        </rule>
    </pattern>
    
    <pattern id="opf.meta.title-type">
        <rule context="opf:meta[normalize-space(@property)='title-type']">
            <assert test="exists(../dc:title[concat('#',normalize-space(@id)) = normalize-space(current()/@refines)])"
                >Property "title-type" must refine a "title" property.</assert>
            <report test="exists(preceding-sibling::opf:meta[normalize-space(@property) = normalize-space(current()/@property)][normalize-space(@refines) = normalize-space(current()/@refines)])"
                >Property "title-type" cannot be declared more than once to refine the same "title" expression.</report>
        </rule>
    </pattern>
    
    <!-- Item checks -->

    <pattern id="opf.itemref">
        <rule context="opf:spine/opf:itemref[@idref]">
            <let name="ref" value="./normalize-space(@idref)"/>
            <let name="item" value="//opf:manifest/opf:item[normalize-space(@id) = $ref]"/>
            <assert test="$item">itemref element idref attribute does not resolve to a manifest item
                element</assert>
        </rule>
    </pattern>

    <pattern id="opf.toc.ncx">
        <rule context="opf:spine[@toc]">
            <let name="ref" value="./normalize-space(@toc)"/>
            <let name="item" value="/opf:package/opf:manifest/opf:item[normalize-space(@id) = $ref]"/>
        	<let name="item-media-type" value="normalize-space($item/@media-type)"/>
            <assert test="$item-media-type = 'application/x-dtbncx+xml'">spine element toc attribute
                must reference the NCX manifest item (referenced media type was "<value-of
                    select="$item-media-type"/>")</assert>
        </rule>
    </pattern>

    <pattern id="opf.toc.ncx.2">
    	<rule context="opf:item[normalize-space(@media-type)='application/x-dtbncx+xml']">
            <assert test="//opf:spine[@toc]">spine element toc attribute must be set when an NCX is
                included in the publication</assert>
        </rule>
    </pattern>

    <pattern id="opf.nav.prop">
        <rule context="opf:manifest">
            <let name="item"
                value="//opf:manifest/opf:item[@properties and tokenize(@properties,'\\s+') = 'nav']"/>
            <assert test="count($item) = 1">Exactly one manifest item must declare the "nav"
                property (number of "nav" items: <value-of select="count($item)"/>).</assert>
        </rule>
    </pattern>

    <pattern id="opf.nav.type">
        <rule
            context="opf:manifest/opf:item[@properties and tokenize(@properties,'\\s+') = 'nav']">
            <assert test="@media-type = 'application/xhtml+xml'">The manifest item representing the
                Navigation Document must be of the "application/xhtml+xml" type (given type was
                    "<value-of select="@media-type"/>")</assert>
        </rule>
    </pattern>
    
    <pattern id="opf.datanav.prop">
        <rule context="opf:manifest">
            <let name="item" value="opf:item[tokenize(@properties, '\\s+') = 'data-nav']"/>
            <assert test="count($item) le 1">Found <value-of select="count($item)"/> "data-nav" items. The manifest must not include more than one Data Navigation Document.</assert>
        </rule>
    </pattern>
    
    <pattern id="opf.cover-image">
        <rule context="opf:manifest">
            <let name="item"
                value="//opf:manifest/opf:item[@properties and tokenize(@properties,'\\s+')='cover-image']"/>
            <assert test="count($item) &lt; 2">Multiple occurrences of the "cover-image" property
                (number of "cover-image" items: <value-of select="count($item)"/>).</assert>
        </rule>
    </pattern>
    
    <!-- Rendition properties checks -->

    <pattern id="opf.rendition.globals">
        <rule context="opf:package/opf:metadata">
        	<assert test="count(opf:meta[normalize-space(@property)='rendition:flow']) le 1">The "rendition:flow"
                property must not occur more than one time in the package metadata.</assert>
        	<assert test="count(opf:meta[normalize-space(@property)='rendition:layout']) le 1">The "rendition:layout"
                property must not occur more than one time in the package metadata.</assert>
        	<assert test="count(opf:meta[normalize-space(@property)='rendition:orientation']) le 1">The
                "rendition:orientation" property must not occur more than one time in the package
                metadata.</assert>
        	<assert test="count(opf:meta[normalize-space(@property)='rendition:spread']) le 1">The "rendition:spread"
                property must not occur more than one time in the package metadata.</assert>
        	<assert test="count(opf:meta[normalize-space(@property)='rendition:viewport'][empty(@refines)]) le 1">The
                "rendition:viewport" property must not occur more than one time as a global value in
                the package metadata.</assert>
        </rule>
    	<rule context="opf:meta[not(ancestor::opf:collection)][normalize-space(@property)='rendition:flow']">
            <assert test="empty(@refines)">The "rendition:flow" property must not be set on elements
                with a "refines" attribute</assert>
            <assert
                test="normalize-space()=('paginated','scrolled-continuous','scrolled-doc','auto')"
                >The value of the "rendition:flow" property must be either "paginated",
                "scrolled-continuous", "scrolled-doc", or "auto"</assert>
        </rule>
    	<rule context="opf:meta[not(ancestor::opf:collection)][normalize-space(@property)=('rendition:layout')]">
            <assert test="empty(@refines)">The "rendition:layout" property must not be set on
                elements with a "refines" attribute</assert>
            <assert test="normalize-space()=('reflowable','pre-paginated')">The value of the
                "rendition:layout" property must be either "reflowable" or "pre-paginated"</assert>
        </rule>
    	<rule context="opf:meta[not(ancestor::opf:collection)][normalize-space(@property)='rendition:orientation']">
            <assert test="empty(@refines)">The "rendition:orientation" property must not be set on
                elements with a "refines" attribute</assert>
            <assert test="normalize-space()=('landscape','portrait','auto')">The value of the
                "rendition:orientation" property must be either "landscape", "portrait" or
                "auto"</assert>
        </rule>
    	<rule context="opf:meta[not(ancestor::opf:collection)][normalize-space(@property)='rendition:spread']">
            <assert test="empty(@refines)">The "rendition:spread" property must not be set on
                elements with a "refines" attribute</assert>
            <assert test="normalize-space()=('none','landscape','portrait','both','auto')">The value
                of the "rendition:spread" property must be either "none", "landscape", "portrait",
                "both" or "auto"</assert>
        </rule>
    	<rule context="opf:meta[not(ancestor::opf:collection)][normalize-space(@property)='rendition:spread']">
            <assert test="empty(@refines)">The "rendition:spread" property must not be set on
                elements with a "refines" attribute</assert>
            <assert test="normalize-space()=('none','landscape','portrait','both','auto')">The value
                of the "rendition:spread" property must be either "none", "landscape", "portrait",
                "both" or "auto"</assert>
        </rule>
    	<rule context="opf:meta[not(ancestor::opf:collection)][normalize-space(@property)='rendition:viewport']">
            <assert
                test="matches(normalize-space(),'^((width=\\d+,\\s*height=\\d+)|(height=\\d+,\\s*width=\\d+))$')"
                >The value of the "rendition:viewport" property must be of the form "width=x,
                height=y"</assert>
        </rule>
    </pattern>

    <pattern id="opf.rendition.overrides">
        <rule context="opf:itemref">
            <assert
                test="count(tokenize(@properties,'\\s+')[.=('rendition:flow-paginated','rendition:flow-scrolled-continuous','rendition:flow-scrolled-doc','rendition:flow-auto')]) le 1"
                >Properties "rendition:flow-paginated", "rendition:flow-scrolled-continuous",
                "rendition:flow-scrolled-doc" and "rendition:flow-auto" are mutually
                exclusive</assert>
            <assert
                test="count(tokenize(@properties,'\\s+')[.=('rendition:layout-reflowable','rendition:layout-pre-paginated')]) le 1"
                >Properties "rendition:layout-reflowable" and "rendition:layout-pre-paginated" are
                mutually exclusive</assert>
            <assert
                test="count(tokenize(@properties,'\\s+')[.=('rendition:orientation-landscape','rendition:orientation-portrait','rendition:orientation-auto')]) le 1"
                >Properties "rendition:orientation-landscape", "rendition:orientation-portrait" and
                "rendition:orientation-auto" are mutually exclusive</assert>
            <assert
                test="count(tokenize(@properties,'\\s+')[.=('page-spread-right','page-spread-left','rendition:page-spread-center')]) le 1"
                >Properties "page-spread-right", "page-spread-left" and
                "rendition:page-spread-center" are mutually exclusive</assert>
            <assert
                test="count(tokenize(@properties,'\\s+')[.=('rendition:spread-portrait','rendition:spread-landscape','rendition:spread-both','rendition:spread-none','rendition:spread-auto')]) le 1"
                >Properties "rendition:spread-portrait", "rendition:spread-landscape",
                "rendition:spread-both", "rendition:spread-none" and "rendition:spread-auto" are
                mutually exclusive</assert>
        </rule>
    </pattern>

    <pattern id="opf.collection.refines-restriction">
        <rule context="opf:collection/opf:metadata/*[@refines]">
        	<let name="refines-target-id" value="substring(normalize-space(@refines), 2)"/>
            <assert
            	test="starts-with(normalize-space(@refines),'#') and ancestor::opf:collection[not(ancestor::opf:collection)]//*[normalize-space(@id)=$refines-target-id]"
                > @refines must point to an element within the current collection </assert>
        </rule>
    </pattern>
    
    <pattern id="opf_guideReferenceUnique">
        <!-- guide/reference element should be unique (#493) -->
        <rule context="opf:reference">
            <let name="current_type_normalized" value="normalize-space(lower-case(@type))"/>
            <let name="current_href_normalized" value="normalize-space(lower-case(@href))"/>
            <assert test="
                count(//opf:reference[
                    normalize-space(lower-case(@type)) = $current_type_normalized and
                    normalize-space(lower-case(@href)) = $current_href_normalized
                ]) le 1">WARNING: Duplicate "reference" elements with the same "type" and "href" attributes</assert>
        </rule>
    </pattern>
    
    <include href="./mod/id-unique.sch"/>
	
	<!-- Media overlay checks -->
	
	<pattern id="opf.duration.metadata.item">
		<rule context="opf:meta[normalize-space(@property)='media:duration']">
			<assert
				test="matches(normalize-space(),'^(([0-9]+:[0-5][0-9]:[0-5][0-9](\\.[0-9]+)?)|((\\s*)[0-5][0-9]:[0-5][0-9](\\.[0-9]+)?(\\s*))|((\\s*)[0-9]+(\\.[0-9]+)?(h|min|s|ms)?(\\s*)))$')"
				>The value of the media:duration property must be a valid SMIL3 clock value</assert>
		</rule>
	</pattern>
	
	<pattern id="opf.media.overlay">
		<rule context="opf:item[@media-overlay]">
			<let name="ref" value="./normalize-space(@media-overlay)"/>
			<let name="item" value="//opf:manifest/opf:item[normalize-space(@id) = $ref]"/>
			<let name="item-media-type" value="normalize-space($item/@media-type)"/>
            <let name="media-type" value="normalize-space(@media-type)"/>
			<assert test="$item-media-type = 'application/smil+xml'">media overlay items must be of
				the "application/smil+xml" type (given type was "<value-of select="$item-media-type"
				/>")</assert>
            <assert test="$media-type='application/xhtml+xml' or $media-type='image/svg+xml'"
                >The media-overlay attribute is only allowed on XHTML and SVG content documents.</assert>
		</rule>
	</pattern>
	
	<pattern id="opf.media.overlay.metadata.global">
		<rule context="opf:manifest[opf:item[@media-overlay]]">
			<assert test="//opf:meta[normalize-space(@property)='media:duration' and not (@refines)]">global
				media:duration meta element not set</assert>
		</rule>
	</pattern>
	
	<pattern id="opf.media.overlay.metadata.item">
		<rule context="opf:manifest/opf:item[@media-overlay]">
			<let name="mo-idref" value="normalize-space(@media-overlay)"/>
			<let name="mo-item" value="//opf:item[normalize-space(@id) = $mo-idref]"/>
			<let name="mo-item-id" value="$mo-item/normalize-space(@id)"/>
			<let name="mo-item-uri" value="concat('#', $mo-item-id)"/>
			<assert test="//opf:meta[normalize-space(@property)='media:duration' and normalize-space(@refines) = $mo-item-uri ]">item
				media:duration meta element not set (expecting: meta property='media:duration'
				refines='<value-of select="$mo-item-uri"/>')</assert>
		</rule>
	</pattern>
	
	<pattern id="opf.media.overlay.metadata.active-class">
	  <rule context="opf:package/opf:metadata">
	    <assert test="count(opf:meta[normalize-space(@property)='media:active-class']) le 1">The 'active-class' property must not occur more than one time in the package
	          metadata.</assert>
	  </rule>
		<rule context="opf:meta[normalize-space(@property)='media:active-class']">
			<report test="@refines"> @refines must not be used with the media:active-class property</report>
		  <report test="contains(normalize-space(.),' ')">the 'active-class' property must define a single class name</report>
		</rule>
	</pattern>
	
	<pattern id="opf.media.overlay.metadata.playback-active-class">
    <rule context="opf:package/opf:metadata">
      <assert test="count(opf:meta[normalize-space(@property)='media:playback-active-class']) le 1">The 'playback-active-class' property must not occur more than one time in the package
           metadata.</assert>
    </rule>
		<rule context="opf:meta[normalize-space(@property)='media:playback-active-class']">
			<report test="@refines"> @refines must not be used with the media:playback-active-class property</report>
		  <report test="contains(normalize-space(.),' ')">the 'playback-active-class' property must define a single class name</report>
		</rule>
    </pattern>

	
	
	<!-- EPUB 3.2 New Checks -->
	
	<pattern id="opf.spine.duplicate.refs">
		<rule context="opf:itemref">
			<report test="normalize-space(./@idref) = preceding-sibling::opf:itemref/normalize-space(@idref)">Itemref refers to the same manifest entry as a previous itemref</report>
		</rule>
	</pattern>
	
	<!-- EPUB 3.2 Deprecated Features -->
	
	<pattern id="opf.bindings.deprecated">
		<rule context="opf:package/opf:bindings">
			<report test=".">WARNING: Use of the bindings element is deprecated</report>
		</rule>
	</pattern>
	

  <!--FIXME deprecation should be in vocab-->
	<pattern id="opf.meta.meta-auth.deprecated">
		<rule context="opf:metadata/opf:meta[normalize-space(@property)='meta-auth']">
			<report test=".">WARNING: Use of the meta-auth property is deprecated</report>
		</rule>
	</pattern>
	
</schema>`;

/**
 * Map of schema filenames to their content
 */
export const SCHEMAS: Record<string, string> = {
  'container.rng': CONTAINER_RNG,
  'epub-nav-30.rnc': EPUB_NAV_30_RNC,
  'epub-nav-30.sch': EPUB_NAV_30_SCH,
  'epub-svg-30.rnc': EPUB_SVG_30_RNC,
  'epub-svg-30.sch': EPUB_SVG_30_SCH,
  'epub-xhtml-30.rnc': EPUB_XHTML_30_RNC,
  'epub-xhtml-30.sch': EPUB_XHTML_30_SCH,
  'ncx.rng': NCX_RNG,
  'ocf-container-30.rnc': OCF_CONTAINER_30_RNC,
  'opf.rng': OPF_RNG,
  'package-30.rnc': PACKAGE_30_RNC,
  'package-30.sch': PACKAGE_30_SCH,
};

/**
 * Get schema content by filename
 */
export function getSchema(filename: string): string | undefined {
  return SCHEMAS[filename];
}
